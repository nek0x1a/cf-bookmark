import { env } from "cloudflare:workers";
import { cn } from "cn";
import { type ComponentProps, useState } from "react";
import BookmarkGroupEdit from "~/components/bookmark/BookmarkGroupEdit";
import { getBookmarks } from "~/db/d1";
import type { Route } from "./+types/home";
import "./edit.css";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "书签编辑" },
    { name: "description", content: "书签数据编辑" },
  ];
}

export async function loader() {
  const db = env.DB;
  const bookmarkdata = await getBookmarks(db);
  return { bookmarkdata: [...bookmarkdata] };
}

export default function EditPage({ loaderData }: Route.ComponentProps) {
  const [bookmarkData, setBookmarkData] = useState(
    structuredClone(loaderData.bookmarkdata),
  );
  const groupElements = bookmarkData.map((group) => (
    <BookmarkGroupEdit
      bookmarkGroupData={group}
      key={group.id}
    ></BookmarkGroupEdit>
  ));

  return (
    <main>
      <h1 className="text-4xl font-bold text-primary-foreground my-8">
        编辑书签
      </h1>
      <OptionElement className="py-2 flex gap-4" />
      {groupElements}
      <OptionElement className="py-2 flex gap-4 border-t-2 border-muted-border" />
    </main>
  );
}

function OptionElement({ className }: ComponentProps<"div">) {
  return (
    <div className={className}>
      <div className="flex-none">
        <a
          className={cn(
            "text-foreground hover:text-primary-foreground",
            "transform duration-200",
          )}
          href="https://lucide.dev/icons/"
          target="_blank"
          rel="noopener"
        >
          [挑选图标]
        </a>
      </div>
      <div
        className={cn(
          "flex-none ml-auto",
          "text-foreground hover:text-primary-foreground",
          "transform duration-200",
        )}
      >
        [新建书签组]
      </div>
      <div
        className={cn(
          "flex-none",
          "text-foreground hover:text-primary-foreground",
          "transform duration-200",
        )}
      >
        [保存]
      </div>
    </div>
  );
}
