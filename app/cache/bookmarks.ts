import { getBookmarks } from "~/db/d1";
import type { BookmarkGroupData } from "~/types/bookmark";

const CACHE_KEY = new Request("https://cf-bookmark.internal/cache/bookmarks");
const CACHE_TTL = 60 * 60 * 24 * 7;

export async function getCachedBookmarks(
  db: D1Database,
): Promise<Iterable<BookmarkGroupData>> {
  const cache = await caches.open("bookmark");
  const cached = await cache.match(CACHE_KEY);
  if (cached) {
    return cached.json();
  }
  let bookmarks = await getBookmarks(db);
  bookmarks = [...bookmarks];
  const response = new Response(JSON.stringify(bookmarks), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_TTL}`,
    },
  });
  await cache.put(CACHE_KEY, response);
  return bookmarks;
}
