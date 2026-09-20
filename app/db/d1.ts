import type { BookmarkGroupData } from "~/types/bookmark";
import type { BookmarkEditChanges } from "~/types/bookmark-edit";
import { validateHref, validateName } from "~/utils/bookmark-validation";

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

function assertGroupRecord(
  group: {
    id: number;
    sort: number;
    name: string;
    emphasized: boolean;
    description: string;
  },
  mode: "create" | "update",
) {
  if (!Number.isInteger(group.id)) {
    throw new Error("无效的书签组 ID");
  }

  if (mode === "create" && group.id >= 0) {
    throw new Error("新建书签组必须使用负数临时 ID");
  }

  if (mode === "update" && group.id < 0) {
    throw new Error("更新书签组不能使用负数 ID");
  }

  if (!Number.isInteger(group.sort) || group.sort < 0) {
    throw new Error("无效的书签组排序值");
  }

  const nameError = validateName(group.name);

  if (nameError) {
    throw new Error(nameError);
  }
}

function assertBookmark(
  bookmark: {
    id: number;
    sort: number;
    name: string;
    href: string;
    icon: string;
    description: string;
  },
  mode: "create" | "update",
) {
  if (!Number.isInteger(bookmark.id)) {
    throw new Error("无效的书签 ID");
  }

  if (mode === "create" && bookmark.id >= 0) {
    throw new Error("新建书签必须使用负数临时 ID");
  }

  if (mode === "update" && bookmark.id < 0) {
    throw new Error("更新书签不能使用负数 ID");
  }

  if (!Number.isInteger(bookmark.sort) || bookmark.sort < 0) {
    throw new Error("无效的书签排序值");
  }

  const nameError = validateName(bookmark.name);

  if (nameError) {
    throw new Error(nameError);
  }

  const hrefError = validateHref(bookmark.href);

  if (hrefError) {
    throw new Error(hrefError);
  }
}

function assertDeleteIds(ids: number[], label: string) {
  for (const id of ids) {
    if (!Number.isInteger(id) || id < 0) {
      throw new Error(`${label}只能删除数据库中的非负 ID`);
    }
  }
}

export async function saveBookmarkChanges(
  db: D1Database,
  changes: BookmarkEditChanges,
): Promise<void> {
  /*
   * 先验证 ID 和字段。
   * 这样负数 ID 永远不会被当作数据库主键写入。
   */
  for (const group of changes.groups.create) {
    assertGroupRecord(group, "create");
  }

  for (const group of changes.groups.update) {
    assertGroupRecord(group, "update");
  }

  assertDeleteIds(changes.groups.delete, "书签组");

  for (const bookmark of changes.bookmarks.create) {
    assertBookmark(bookmark.bookmark, "create");
  }

  for (const bookmark of changes.bookmarks.update) {
    assertBookmark(bookmark.bookmark, "update");
  }

  assertDeleteIds(changes.bookmarks.delete, "书签");

  /*
   * temp group id -> real DB id
   *
   * 例如：
   * -1 -> 23
   * -2 -> 24
   */
  const groupIdMap = new Map<number, number>();

  /*
   * 第一阶段：
   * 只插入新书签组。
   *
   * 不把临时 id 写入数据库，
   * 让 INTEGER PRIMARY KEY 自己生成。
   */
  if (changes.groups.create.length > 0) {
    const results = await db.batch(
      changes.groups.create.map((group) =>
        db
          .prepare(`
            INSERT INTO bookmark_groups
              (
                name,
                emphasized,
                description,
                sort_order
              )
            VALUES (?, ?, ?, ?)
          `)
          .bind(
            group.name,
            group.emphasized ? 1 : 0,
            group.description,
            group.sort,
          ),
      ),
    );

    changes.groups.create.forEach((group, index) => {
      const id = results[index]?.meta.last_row_id;

      if (typeof id !== "number" || id < 0) {
        throw new Error("无法取得新建书签组的数据库 ID");
      }

      groupIdMap.set(group.id, id);
    });
  }

  function resolveGroupId(groupId: number): number {
    if (groupId >= 0) {
      return groupId;
    }

    const realId = groupIdMap.get(groupId);

    if (realId === undefined) {
      throw new Error(`找不到临时书签组 ID：${groupId}`);
    }

    return realId;
  }

  /*
   * 第二阶段：
   *
   * 1. INSERT 新书签
   * 2. UPDATE 已存在书签
   * 3. DELETE 已删除书签
   * 4. UPDATE 组
   * 5. DELETE 组
   *
   * 注意：
   * 书签 update 要在 group delete 前执行。
   *
   * 这样即使：
   *
   * 原组 A 被删除
   * ↓
   * 原组中的书签被移动到 B
   *
   * UPDATE bookmarks
   * ↓
   * DELETE old group A
   *
   * 移动出去的书签也不会被 A 的删除操作误删。
   */
  try {
    const statements: D1PreparedStatement[] = [];

    for (const { groupId, bookmark } of changes.bookmarks.create) {
      statements.push(
        db
          .prepare(`
            INSERT INTO bookmarks
              (
                group_id,
                name,
                href,
                icon,
                description,
                sort_order
              )
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .bind(
            resolveGroupId(groupId),
            bookmark.name,
            bookmark.href,
            bookmark.icon,
            bookmark.description,
            bookmark.sort,
          ),
      );
    }

    for (const { groupId, bookmark } of changes.bookmarks.update) {
      statements.push(
        db
          .prepare(`
            UPDATE bookmarks
            SET
              group_id = ?,
              name = ?,
              href = ?,
              icon = ?,
              description = ?,
              sort_order = ?
            WHERE id = ?
          `)
          .bind(
            resolveGroupId(groupId),
            bookmark.name,
            bookmark.href,
            bookmark.icon,
            bookmark.description,
            bookmark.sort,
            bookmark.id,
          ),
      );
    }

    for (const bookmarkId of changes.bookmarks.delete) {
      statements.push(
        db.prepare("DELETE FROM bookmarks WHERE id = ?").bind(bookmarkId),
      );
    }

    for (const group of changes.groups.update) {
      statements.push(
        db
          .prepare(`
            UPDATE bookmark_groups
            SET
              name = ?,
              emphasized = ?,
              description = ?,
              sort_order = ?
            WHERE id = ?
          `)
          .bind(
            group.name,
            group.emphasized ? 1 : 0,
            group.description,
            group.sort,
            group.id,
          ),
      );
    }

    for (const groupId of changes.groups.delete) {
      statements.push(
        db.prepare("DELETE FROM bookmarks WHERE group_id = ?").bind(groupId),
      );

      statements.push(
        db.prepare("DELETE FROM bookmark_groups WHERE id = ?").bind(groupId),
      );
    }

    if (statements.length === 0) {
      return;
    }

    await db.batch(statements);
  } catch (error) {
    /*
     * 新组的创建是在第二阶段之外进行的。
     *
     * 如果第二阶段失败，把这次刚创建、目前还没有
     * 成功关联任何书签的新组清理掉。
     */
    if (groupIdMap.size > 0) {
      try {
        await db.batch(
          [...groupIdMap.values()].map((groupId) =>
            db
              .prepare("DELETE FROM bookmark_groups WHERE id = ?")
              .bind(groupId),
          ),
        );
      } catch (cleanupError) {
        console.error("清理保存失败产生的新建书签组失败", cleanupError);
      }
    }

    throw error;
  }
}
