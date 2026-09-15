import { env } from "cloudflare:workers";
import { useState } from "react";
import { BookmarkGroupEdit } from "~/components/Bookmark/BookmarkEdit";
import { getBookmarks } from "~/db/d1";
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
  const groupElement = bookmarkData
    .sort((group) => group.sort)
    .map((group) => (
      <BookmarkGroupEdit
        bookmarkGroupData={group}
        key={group.id}
      ></BookmarkGroupEdit>
    ));

  return (
    <main>
      <h1 className="text-4xl font-bold text-emphasized my-8">编辑书签</h1>
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(20em,1fr))]">
        {groupElement}
      </div>
    </main>
  );
}
