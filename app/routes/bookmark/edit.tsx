import { env } from "cloudflare:workers";
import { cn } from "cn";
import { useCallback, useState } from "react";
import { data } from "react-router";
import { setCachedBookmarks } from "~/cache/bookmarks";
import { BookmarkGroupEdit } from "~/components/Bookmark/BookmarkGroupEdit";
import BookmarkSaveButton from "~/components/Bookmark/BookmarkSaveButton";
import { ConfirmDeleteProvider } from "~/components/Bookmark/ConfirmDeleteButton";
import NewContent from "~/components/Bookmark/NewContent";
import { getBookmarks, saveBookmarkChanges } from "~/db/d1";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import {
  type BookmarkChangeSet,
  type BookmarkIdMap,
  createTemporaryBookmarkId,
  createTemporaryGroupId,
} from "~/utils/bookmarkDiff";
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

export async function action({ request }: Route.ActionArgs) {
  let changes: BookmarkChangeSet;

  /*
   * 请求解析失败属于客户端请求错误。
   */
  try {
    if (request.method.toUpperCase() !== "POST") {
      return data(
        {
          ok: false,
          error: "不支持的请求方式。",
        },
        { status: 405 },
      );
    }

    const body = (await request.json()) as {
      changes?: BookmarkChangeSet;
    };

    if (!body.changes) {
      return data(
        {
          ok: false,
          error: "保存数据格式无效。",
        },
        { status: 400 },
      );
    }

    changes = body.changes;
  } catch (error) {
    console.error("解析书签保存请求失败", error);

    return data(
      {
        ok: false,
        error: "保存数据格式无效。",
      },
      { status: 400 },
    );
  }

  /*
   * 这里只负责数据库事务。
   *
   * 如果 batch 中任意一步失败，
   * saveBookmarkChanges 会抛异常，
   * 数据库整体回滚。
   */
  let idMap: BookmarkIdMap | null = null;

  try {
    idMap = await saveBookmarkChanges(env.DB, changes);
  } catch (error) {
    console.error("保存书签到 D1 失败", error);

    return data(
      {
        ok: false,
        error: "保存失败，数据库未发生修改。",
      },
      { status: 500 },
    );
  }

  /*
   * 数据库事务成功之后，再读取最终数据并更新缓存。
   *
   * 这一步不属于 D1 事务本身。
   * Cache API 出错不能再回滚已经提交的数据库事务，
   * 因此只记录 warning，并仍然视为数据库保存成功。
   */
  let bookmarkData: BookmarkGroupData[] | null = null;

  let cacheUpdated = false;

  try {
    bookmarkData = [...(await getBookmarks(env.DB))];

    await setCachedBookmarks(bookmarkData);

    cacheUpdated = true;
  } catch (error) {
    console.error("保存后刷新书签缓存失败", error);
  }

  return {
    ok: true,
    bookmarkData,
    idMap,
    cacheUpdated,
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
      const nextBookmarkId = createTemporaryBookmarkId(currentData);

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
      const nextGroupId = createTemporaryGroupId(currentData);

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

  const handleBookmarkSaved = useCallback((savedData: BookmarkGroupData[]) => {
    setBookmarkData(savedData);
  }, []);

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
      <div className="flex justify-between my-8">
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
            <BookmarkSaveButton
              originalData={loaderData.bookmarkdata}
              bookmarkData={bookmarkData}
              onSaved={handleBookmarkSaved}
            />
          </span>
        </div>
      </div>

      <ConfirmDeleteProvider>
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
      </ConfirmDeleteProvider>

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
