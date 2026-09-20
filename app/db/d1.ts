import type { BookmarkGroupData } from "~/types/bookmark";

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
