import type { BookmarkGroupData } from "~/types/bookmark";
import type { BookmarkChangeSet, BookmarkIdMap } from "~/utils/bookmarkDiff";

type BookmarkDataRow = {
  bookmarkId: number | null;
  bookmarkName: string | null;
  bookmarkHref: string | null;
  bookmarkIcon: string | null;
  bookmarkDescription: string | null;
  bookmarkSort: number | null;

  groupId: number;
  groupName: string;
  groupEmphasized: number;
  groupDescription: string;
  groupSort: number;
};

export async function getBookmarks(
  db: D1Database,
): Promise<BookmarkGroupData[]> {
  const dbData = await db
    .prepare(`
      SELECT
        b.id AS bookmarkId,
        b.name AS bookmarkName,
        b.href AS bookmarkHref,
        b.icon AS bookmarkIcon,
        b.description AS bookmarkDescription,
        b.sort_order AS bookmarkSort,
        g.id AS groupId,
        g.name AS groupName,
        g.emphasized AS groupEmphasized,
        g.description AS groupDescription,
        g.sort_order AS groupSort
      FROM bookmark_groups g
      LEFT JOIN bookmarks b
        ON b.group_id = g.id
      ORDER BY g.sort_order, b.sort_order;
    `)
    .all<BookmarkDataRow>();

  const bookmarkGroupMap = new Map<number, BookmarkGroupData>();

  for (const record of dbData.results) {
    let group = bookmarkGroupMap.get(record.groupId);

    if (!group) {
      group = {
        id: record.groupId,
        sort: record.groupSort,
        name: record.groupName,
        emphasized: !!record.groupEmphasized,
        description: record.groupDescription,
        bookmarks: [],
      };

      bookmarkGroupMap.set(record.groupId, group);
    }

    if (record.bookmarkId !== null) {
      group.bookmarks.push({
        id: record.bookmarkId,
        sort: record.bookmarkSort ?? 0,
        name: record.bookmarkName ?? "",
        href: record.bookmarkHref ?? "",
        icon: record.bookmarkIcon ?? "",
        description: record.bookmarkDescription ?? "",
      });
    }
  }

  return [...bookmarkGroupMap.values()];
}

function assertPositiveId(id: number, message: string) {
  if (!Number.isInteger(id) || id < 0) {
    throw new Error(message);
  }
}

function assertNegativeId(id: number, message: string) {
  if (!Number.isInteger(id) || id >= 0) {
    throw new Error(message);
  }
}

function getInsertedId(result: D1Result, message: string): number {
  const row = result.results[0] as
    | {
        id?: unknown;
      }
    | undefined;

  if (!row || typeof row.id !== "number" || !Number.isInteger(row.id)) {
    throw new Error(message);
  }

  return row.id;
}

export async function saveBookmarkChanges(
  db: D1Database,
  changes: BookmarkChangeSet,
): Promise<BookmarkIdMap> {
  const statements: D1PreparedStatement[] = [];

  const groupInsertStatementIndex = new Map<number, number>();
  const bookmarkInsertStatementIndex = new Map<number, number>();

  /*
   * 新书签组的数据库 ID 是自增的。
   *
   * 由于前端需要在保存成功后知道：
   *   -1 -> 42
   *
   * 所以事务内部维护一个临时映射表。
   */
  if (changes.groups.create.length > 0) {
    statements.push(
      db.prepare(`
        CREATE TEMP TABLE bookmark_save_new_groups (
          temporary_id INTEGER PRIMARY KEY,
          database_id INTEGER NOT NULL
        );
      `),
    );
  }

  /*
   * 先删除真正被删除的书签。
   *
   * 必须早于删除分组。
   */
  for (const bookmarkId of changes.bookmarks.delete) {
    assertPositiveId(bookmarkId, `非法的书签删除 ID: ${bookmarkId}`);

    statements.push(
      db.prepare("DELETE FROM bookmarks WHERE id = ?").bind(bookmarkId),
    );
  }

  /*
   * 创建新分组。
   *
   * 数据库 ID 不使用前端负数，而由 SQLite / D1 自增。
   */
  for (const group of changes.groups.create) {
    assertNegativeId(group.id, `非法的新书签组临时 ID: ${group.id}`);

    const groupInsertIndex = statements.length;

    groupInsertStatementIndex.set(group.id, groupInsertIndex);

    statements.push(
      db
        .prepare(`
          INSERT INTO bookmark_groups (
            name,
            emphasized,
            description,
            sort_order
          )
          VALUES (?, ?, ?, ?)
          RETURNING id;
        `)
        .bind(
          group.name,
          group.emphasized ? 1 : 0,
          group.description,
          group.sort,
        ),
    );

    /*
     * last_insert_rowid() 此时仍然是刚刚创建的分组 ID。
     */
    statements.push(
      db
        .prepare(`
          INSERT INTO bookmark_save_new_groups (
            temporary_id,
            database_id
          )
          VALUES (?, last_insert_rowid());
        `)
        .bind(group.id),
    );

    /*
     * 新组中的新书签也使用数据库自增。
     */
    for (const bookmark of group.bookmarks) {
      assertNegativeId(bookmark.id, `非法的新书签临时 ID: ${bookmark.id}`);

      const bookmarkInsertIndex = statements.length;

      bookmarkInsertStatementIndex.set(bookmark.id, bookmarkInsertIndex);

      statements.push(
        db
          .prepare(`
            INSERT INTO bookmarks (
              name,
              href,
              icon,
              description,
              sort_order,
              group_id
            )
            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              (
                SELECT database_id
                FROM bookmark_save_new_groups
                WHERE temporary_id = ?
              )
            )
            RETURNING id;
          `)
          .bind(
            bookmark.name,
            bookmark.href,
            bookmark.icon,
            bookmark.description,
            bookmark.sort,
            group.id,
          ),
      );
    }
  }

  /*
   * 更新已有书签。
   *
   * groupId 可以是：
   *   >= 0：已有分组
   *   < 0：刚刚创建的新分组
   */
  for (const bookmark of changes.bookmarks.update) {
    assertPositiveId(bookmark.id, `非法的书签更新 ID: ${bookmark.id}`);

    const setClauses: string[] = [];
    const values: Array<string | number> = [];

    if (bookmark.changes.sort !== undefined) {
      setClauses.push("sort_order = ?");
      values.push(bookmark.changes.sort);
    }

    if (bookmark.changes.name !== undefined) {
      setClauses.push("name = ?");
      values.push(bookmark.changes.name);
    }

    if (bookmark.changes.href !== undefined) {
      setClauses.push("href = ?");
      values.push(bookmark.changes.href);
    }

    if (bookmark.changes.icon !== undefined) {
      setClauses.push("icon = ?");
      values.push(bookmark.changes.icon);
    }

    if (bookmark.changes.description !== undefined) {
      setClauses.push("description = ?");
      values.push(bookmark.changes.description);
    }

    let temporaryGroupId: number | null = null;

    if (bookmark.changes.groupId !== undefined) {
      if (bookmark.changes.groupId < 0) {
        temporaryGroupId = bookmark.changes.groupId;

        setClauses.push(`
          group_id = (
            SELECT database_id
            FROM bookmark_save_new_groups
            WHERE temporary_id = ?
          )
        `);
      } else {
        assertPositiveId(
          bookmark.changes.groupId,
          `非法的目标书签组 ID: ${bookmark.changes.groupId}`,
        );

        setClauses.push("group_id = ?");
        values.push(bookmark.changes.groupId);
      }
    }

    if (setClauses.length === 0) {
      continue;
    }

    if (temporaryGroupId !== null) {
      values.push(temporaryGroupId);
    }

    values.push(bookmark.id);

    statements.push(
      db
        .prepare(`
          UPDATE bookmarks
          SET ${setClauses.join(", ")}
          WHERE id = ?
        `)
        .bind(...values),
    );
  }

  /*
   * 已有书签组中的新增书签。
   */
  for (const bookmark of changes.bookmarks.create) {
    assertNegativeId(bookmark.id, `非法的新书签临时 ID: ${bookmark.id}`);

    assertPositiveId(
      bookmark.groupId,
      `非法的新书签所属分组 ID: ${bookmark.groupId}`,
    );

    const bookmarkInsertIndex = statements.length;

    bookmarkInsertStatementIndex.set(bookmark.id, bookmarkInsertIndex);

    statements.push(
      db
        .prepare(`
          INSERT INTO bookmarks (
            name,
            href,
            icon,
            description,
            sort_order,
            group_id
          )
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING id;
        `)
        .bind(
          bookmark.name,
          bookmark.href,
          bookmark.icon,
          bookmark.description,
          bookmark.sort,
          bookmark.groupId,
        ),
    );
  }

  /*
   * 更新已有分组。
   */
  for (const group of changes.groups.update) {
    assertPositiveId(group.id, `非法的书签组更新 ID: ${group.id}`);

    const setClauses: string[] = [];
    const values: Array<string | number> = [];

    if (group.changes.sort !== undefined) {
      setClauses.push("sort_order = ?");
      values.push(group.changes.sort);
    }

    if (group.changes.name !== undefined) {
      setClauses.push("name = ?");
      values.push(group.changes.name);
    }

    if (group.changes.description !== undefined) {
      setClauses.push("description = ?");
      values.push(group.changes.description);
    }

    if (group.changes.emphasized !== undefined) {
      setClauses.push("emphasized = ?");
      values.push(group.changes.emphasized ? 1 : 0);
    }

    if (setClauses.length === 0) {
      continue;
    }

    values.push(group.id);

    statements.push(
      db
        .prepare(`
          UPDATE bookmark_groups
          SET ${setClauses.join(", ")}
          WHERE id = ?
        `)
        .bind(...values),
    );
  }

  /*
   * 最后删除分组。
   *
   * 此时：
   * - 真正删除的 bookmark 已经删除
   * - 被移动的 bookmark 已经指向新组
   */
  for (const groupId of changes.groups.delete) {
    assertPositiveId(groupId, `非法的书签组删除 ID: ${groupId}`);

    statements.push(
      db.prepare("DELETE FROM bookmark_groups WHERE id = ?").bind(groupId),
    );
  }

  if (changes.groups.create.length > 0) {
    statements.push(db.prepare("DROP TABLE bookmark_save_new_groups;"));
  }

  if (statements.length === 0) {
    return {
      groups: [],
      bookmarks: [],
    };
  }

  /*
   * D1 batch 是这整个保存操作的事务边界。
   *
   * 任意 statement 失败：
   *   整个 batch 回滚。
   */
  const results = await db.batch(statements);

  const idMap: BookmarkIdMap = {
    groups: [],
    bookmarks: [],
  };

  for (const group of changes.groups.create) {
    const statementIndex = groupInsertStatementIndex.get(group.id);

    if (statementIndex === undefined) {
      throw new Error(`无法找到书签组 ${group.id} 的插入结果`);
    }

    const databaseId = getInsertedId(
      results[statementIndex],
      `无法获得新书签组 ${group.id} 的数据库 ID`,
    );

    idMap.groups.push([group.id, databaseId]);
  }

  for (const bookmark of [
    ...changes.bookmarks.create,
    ...changes.groups.create.flatMap((group) => group.bookmarks),
  ]) {
    const statementIndex = bookmarkInsertStatementIndex.get(bookmark.id);

    if (statementIndex === undefined) {
      throw new Error(`无法找到新书签 ${bookmark.id} 的插入结果`);
    }

    const databaseId = getInsertedId(
      results[statementIndex],
      `无法获得新书签 ${bookmark.id} 的数据库 ID`,
    );

    idMap.bookmarks.push([bookmark.id, databaseId]);
  }

  return idMap;
}
