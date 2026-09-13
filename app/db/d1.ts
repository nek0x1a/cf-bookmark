import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";

export async function getBookmarks(
  db: D1Database,
): Promise<BookmarkGroupData[]> {
  const dbGroups = await db
    .prepare(`
      SELECT id, name, emphasized, description, sort_order
      FROM bookmark_groups
      ORDER BY sort_order
    `)
    .all();

  const dbBookmarks = await db
    .prepare(`
      SELECT id, group_id, name, href, icon, description, sort_order
      FROM bookmarks
      ORDER BY group_id, sort_order
    `)
    .all();

  const bookmarkMap = dbBookmarks.results.reduce((acc, vaule) => {
    const group_id = vaule.group_id as number;
    const bookmark: BookmarkData = {
      name: vaule.name as string,
      href: vaule.href as string,
      icon: vaule.icon as string,
      description: vaule.description as string,
    };
    if (!acc.get(group_id)) {
      acc.set(group_id, [bookmark]);
      return acc;
    }
    acc.get(group_id)?.push(bookmark);
    return acc;
  }, new Map<number, BookmarkData[]>());

  const bookmarkGroups = dbGroups.results.map((group) => {
    const gid = group.id as number;
    return {
      name: group.name as string,
      emphasized: !!group.emphasized,
      description: group.description as string,
      bookmarks: bookmarkMap.get(gid) ?? [],
    };
  });

  return bookmarkGroups;
}
