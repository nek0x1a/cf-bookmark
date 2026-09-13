import { BookmarkGroup } from "~/components/Bookmark";
import Footer from "~/components/Frame/Footer";
import Greeting from "~/components/Greeting";
import bookmarkdata from "~/data/bookmarks.json";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "书签" },
    { name: "description", content: "这是一个书签页" },
  ];
}

export function loader() {
  return { bookmarkdata: bookmarkdata };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const bookmarkEmphasizedGroups = loaderData.bookmarkdata
    .filter((group) => group.emphasized)
    .map((group) => (
      <BookmarkGroup
        className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(12em,1fr))]"
        name={group.name}
        emphasized={group.emphasized}
        bookmarks={group.bookmarks}
        key={group.name}
      ></BookmarkGroup>
    ));
  const bookmarkNormalGroups = loaderData.bookmarkdata
    .filter((group) => !group.emphasized)
    .map((group) => (
      <BookmarkGroup
        name={group.name}
        emphasized={group.emphasized}
        bookmarks={group.bookmarks}
        key={group.name}
      ></BookmarkGroup>
    ));

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-between my-16">
        <Greeting className="flex-none" />
        <div className="flex-none">[编辑]</div>
      </div>
      <main className="flex flex-col gap-8">
        {bookmarkEmphasizedGroups}
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(12em,1fr))]">
          {bookmarkNormalGroups}
        </div>
      </main>

      <Footer className="my-8" />
    </>
  );
}
