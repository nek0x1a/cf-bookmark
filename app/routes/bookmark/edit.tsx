import { env } from "cloudflare:workers";
import { cn } from "cn";
import BookmarkGroupEdit from "~/components/bookmark/BookmarkGroupEdit";
import { getBookmarks } from "~/db/d1";
import type { Route } from "./+types/home";

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
  const bookmarkElements = loaderData.bookmarkdata.map((group) => (
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
      <div className="my-4 flex gap-4 justify-end">
        <div
          className={cn(
            "text-foreground hover:text-primary-foreground",
            "transform duration-200",
          )}
        >
          [新建书签组]
        </div>
        <div
          className={cn(
            "text-foreground hover:text-primary-foreground",
            "transform duration-200",
          )}
        >
          [保存]
        </div>
      </div>
      <ol>{bookmarkElements}</ol>
    </main>
  );
}
