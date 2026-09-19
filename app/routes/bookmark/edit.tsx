import { env } from "cloudflare:workers";
import { cn } from "cn";
import { useCallback, useState } from "react";
import { BookmarkGroupEdit } from "~/components/Bookmark/BookmarkGroupEdit";
import NewContent from "~/components/Bookmark/NewContent";
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
    registerBookmarkContainerRef,
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

  const handleBookmarkAdd = useCallback((groupId: BookmarkGroupData["id"]) => {
    setBookmarkData((currentData) => {
      const nextBookmarkId =
        currentData
          .flatMap((group) => group.bookmarks)
          .reduce((maxId, bookmark) => Math.max(maxId, bookmark.id), 0) + 1;

      return currentData.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        const nextSort =
          group.bookmarks.reduce(
            (maxSort, bookmark) => Math.max(maxSort, bookmark.sort),
            -1,
          ) + 1;

        return {
          ...group,
          bookmarks: [
            ...group.bookmarks,
            {
              id: nextBookmarkId,
              sort: nextSort,
              name: "示例书签",
              href: "https://example.com",
              icon: "bookmark",
              description: "这是一个示例书签",
            },
          ],
        };
      });
    });
  }, []);

  const handleBookmarkDelete = useCallback((bookmarkId: BookmarkData["id"]) => {
    setBookmarkData((currentData) =>
      currentData.map((group) => {
        if (!group.bookmarks.some((bookmark) => bookmark.id === bookmarkId)) {
          return group;
        }

        const bookmarks = group.bookmarks
          .filter((bookmark) => bookmark.id !== bookmarkId)
          .sort((a, b) => a.sort - b.sort)
          .map((bookmark, index) => ({
            ...bookmark,
            sort: index,
          }));

        return {
          ...group,
          bookmarks,
        };
      }),
    );
  }, []);

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

  const handleBookmarkGroupAdd = useCallback(() => {
    setBookmarkData((currentData) => {
      const nextGroupId =
        currentData.reduce((maxId, group) => Math.max(maxId, group.id), 0) + 1;

      const nextSort =
        currentData.reduce(
          (maxSort, group) => Math.max(maxSort, group.sort),
          -1,
        ) + 1;

      return [
        ...currentData,
        {
          id: nextGroupId,
          sort: nextSort,
          name: "示例分组",
          description: "这是一个示例书签组",
          emphasized: false,
          bookmarks: [],
        },
      ];
    });
  }, []);

  const handleBookmarkGroupDelete = useCallback(
    (groupId: BookmarkGroupData["id"]) => {
      setBookmarkData((currentData) =>
        currentData
          .filter((group) => group.id !== groupId)
          .sort((a, b) => a.sort - b.sort)
          .map((group, index) => ({
            ...group,
            sort: index,
          })),
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
        bookmarkContainerRef={registerBookmarkContainerRef}
        onBookmarkPointerDown={handleBookmarkPointerDown}
        draggingBookmarkId={draggingBookmarkId}
        onBookmarkChange={handleBookmarkChange}
        onBookmarkAdd={handleBookmarkAdd}
        onBookmarkDelete={handleBookmarkDelete}
        onBookmarkGroupChange={handleBookmarkGroupChange}
        onBookmarkGroupDelete={handleBookmarkGroupDelete}
      />
    ));

  return (
    <main>
      <div className="flex justify-between  my-8">
        <h1 className="flex-none text-4xl font-bold text-primary-foreground">
          编辑书签
        </h1>
        <div className="flex flex-none gap-4">
          <span>
            <a href="https://lucide.dev/icons" target="_blank" rel="noopener">
              [挑选图标]
            </a>
          </span>
          <span>
            <button type="button">[保存数据]</button>
          </span>
        </div>
      </div>

      <div className="columns-[20em] gap-4">
        {groupElement}

        <NewContent
          className={cn(
            "w-full py-4",
            "border rounded-md",
            "border-dashed hover:border-solid",
            "border-muted-foreground hover:border-foreground",
          )}
          text="添加分组"
          onClick={handleBookmarkGroupAdd}
        />
      </div>

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
