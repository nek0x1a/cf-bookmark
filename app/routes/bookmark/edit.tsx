import { env } from "cloudflare:workers";
import { useState } from "react";
import { BookmarkGroupEdit } from "~/components/Bookmark/BookmarkEdit";
import { getBookmarks } from "~/db/d1";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import type { Route } from "./+types/edit";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "编辑书签" },
    { name: "description", content: "书签编辑页面" },
  ];
}

export async function loader() {
  const db = env.DB;
  const bookmarkdata = await getBookmarks(db);
  return { bookmarkdata: [...bookmarkdata] };
}

export default function EditBookmark({ loaderData }: Route.ComponentProps) {
  const [bookmarkData, setBookmarkData] = useState(
    structuredClone(loaderData.bookmarkdata),
  );

  /**
   * 更新单个书签。
   *
   * BookmarkEdit 不直接修改 bookmarkData，
   * 而是通过这个 callback 把已经确认的字段修改传回来。
   */
  const handleBookmarkChange = (
    bookmarkId: BookmarkData["id"],
    changes: Partial<
      Pick<BookmarkData, "name" | "href" | "icon" | "description">
    >,
  ) => {
    setBookmarkData((currentData) =>
      currentData.map((group) => ({
        ...group,
        bookmarks: group.bookmarks.map((bookmark) =>
          bookmark.id === bookmarkId
            ? {
                ...bookmark,
                ...changes,
              }
            : bookmark,
        ),
      })),
    );
  };
  const handleBookmarkGroupChange = (
    groupId: BookmarkGroupData["id"],
    changes: Partial<Pick<BookmarkGroupData, "emphasized">>,
  ) => {
    setBookmarkData((currentData) =>
      currentData.map((group) =>
        group.id === groupId
          ? {
              ...group,
              ...changes,
            }
          : group,
      ),
    );
  };

  const groupElement = [...bookmarkData]
    .sort((a, b) => a.sort - b.sort)
    .map((group) => (
      <BookmarkGroupEdit
        bookmarkGroupData={group}
        key={group.id}
        onBookmarkChange={handleBookmarkChange}
        onBookmarkGroupChange={handleBookmarkGroupChange}
      />
    ));

  return (
    <main>
      <h1 className="text-4xl font-bold text-primary-foreground my-8">
        编辑书签
      </h1>
      <div className="columns-[20em] gap-4">{groupElement}</div>
    </main>
  );
}
