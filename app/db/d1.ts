import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";

type BookmarkDataRow = {
  bookmarkId: number;
  bookmarkName: string;
  bookmarkHref: string;
  bookmarkIcon: string;
  bookmarkDescription: string;
  bookmarkSort: number;
  groupId: number;
  groupName: string;
  groupEmphasized: number;
  groupDescription: string;
  groupSort: number;
};

export async function getBookmarks(
  db: D1Database,
): Promise<Iterable<BookmarkGroupData>> {
  const dbData = await db
    .prepare(`
      SELECT
        b.id AS bookmarkId, b.name AS bookmarkName, b.href AS bookmarkHref, b.icon AS bookmarkIcon, b.description AS bookmarkDescription, b.sort_order AS bookmarkSort,
        g.id AS groupId, g.name AS groupName, g.emphasized AS groupEmphasized, g.description AS groupDescription, g.sort_order AS groupSort
      FROM bookmarks b
      LEFT JOIN bookmark_groups g
      ON b.group_id = g.id
      ORDER BY g.sort_order, b.sort_order;
    `)
    .all<BookmarkDataRow>();
  const bookmarkGroupMap = dbData.results.reduce((acc, record) => {
    const bookmark: BookmarkData = {
      id: record.bookmarkId,
      sort: record.bookmarkSort,
      name: record.bookmarkName,
      href: record.bookmarkHref,
      icon: record.bookmarkIcon,
      description: record.bookmarkDescription,
    };
    if (acc.get(record.groupId)) {
      acc.get(record.groupId)?.bookmarks.push(bookmark);
      return acc;
    }
    acc.set(record.groupId, {
      id: record.groupId,
      sort: record.groupSort,
      name: record.groupName,
      emphasized: !!record.groupEmphasized,
      description: record.groupDescription,
      bookmarks: [bookmark],
    });
    return acc;
  }, new Map<number, BookmarkGroupData>());

  return bookmarkGroupMap.values();
}
