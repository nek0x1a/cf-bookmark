import { env } from "cloudflare:workers";
import { useCallback, useState } from "react";
import { BookmarkGroupEdit } from "~/components/Bookmark/BookmarkGroupEdit";
import { getBookmarks } from "~/db/d1";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import type { Route } from "./+types/edit";
import { useBookmarkDragAndDrop } from "./useBookmarkDragAndDrop";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "编辑书签" },
    {
      name: "description",
      content: "书签编辑页面",
    },
  ];
}

export async function loader() {
  const db = env.DB;
  const bookmarkdata = await getBookmarks(db);

  return {
    bookmarkdata: [...bookmarkdata],
  };
}

export default function EditBookmark({ loaderData }: Route.ComponentProps) {
  const [bookmarkData, setBookmarkData] = useState<BookmarkGroupData[]>(
    structuredClone(loaderData.bookmarkdata),
  );

  const {
    draggingGroupId,
    draggingBookmarkId,
    dragPreview,
    dropTarget,
    registerGroupRef,
    registerBookmarkRef,
    handleGroupPointerDown,
    handleBookmarkPointerDown,
  } = useBookmarkDragAndDrop({
    setBookmarkData,
  });

  const handleBookmarkChange = useCallback(
    (
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
    },
    [],
  );

  const handleBookmarkGroupChange = useCallback(
    (
      groupId: BookmarkGroupData["id"],
      changes: Partial<
        Pick<BookmarkGroupData, "name" | "description" | "emphasized">
      >,
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
    },
    [],
  );

  const groupElement = [...bookmarkData]
    .sort((a, b) => a.sort - b.sort)
    .map((group, index) => (
      <BookmarkGroupEdit
        key={group.id}
        ref={(element) => {
          registerGroupRef(group.id, index, element);
        }}
        bookmarkGroupData={group}
        className={
          draggingGroupId === group.id
            ? "opacity-40 cursor-grabbing"
            : "cursor-grab"
        }
        onPointerDown={(event) => {
          handleGroupPointerDown(event, group.id, index);
        }}
        bookmarkRef={registerBookmarkRef}
        onBookmarkPointerDown={handleBookmarkPointerDown}
        draggingBookmarkId={draggingBookmarkId}
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

      {dragPreview && (
        <div
          className="fixed z-50 pointer-events-none rounded-md border-2 border-foreground/50 bg-background/40"
          style={{
            left: dragPreview.left,
            top: dragPreview.top,
            width: dragPreview.width,
            height: dragPreview.height,
          }}
        />
      )}

      {dropTarget && (
        <div
          className="fixed z-50 pointer-events-none rounded-sm bg-black/70"
          style={{
            left: dropTarget.left,
            top: dropTarget.top,
            width: dropTarget.width,
            height: dropTarget.height,
          }}
        />
      )}
    </main>
  );
}
