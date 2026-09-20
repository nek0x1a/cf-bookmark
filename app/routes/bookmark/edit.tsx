import { env } from "cloudflare:workers";
import { cn } from "cn";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFetcher } from "react-router";
import { setCachedBookmarks } from "~/cache/bookmarks";
import BookmarkGroupEdit from "~/components/bookmark/BookmarkGroupEdit";
import { getBookmarks, saveBookmarkChanges } from "~/db/d1";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import type {
  BookmarkEditChanges,
  DeleteTarget,
  DragState,
  EditableBookmarkFields,
  EditableBookmarkGroupFields,
} from "~/types/bookmark-edit";

import type { Route } from "./+types/edit";
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

type SaveActionResponse =
  | {
      ok: true;
      bookmarkdata: BookmarkGroupData[];
    }
  | {
      ok: false;
      error: string;
    };

export async function action({ request }: Route.ActionArgs) {
  try {
    const body = (await request.json()) as {
      changes?: BookmarkEditChanges;
    };

    if (!body.changes) {
      return {
        ok: false,
        error: "保存数据为空",
      } satisfies SaveActionResponse;
    }

    await saveBookmarkChanges(env.DB, body.changes);

    const bookmarkdata = await getBookmarks(env.DB);

    // 首页使用的是 Cache API，因此保存成功后同步更新缓存。
    try {
      await setCachedBookmarks(bookmarkdata);
    } catch (error) {
      console.error("更新书签缓存失败", error);
    }

    return {
      ok: true,
      bookmarkdata,
    } satisfies SaveActionResponse;
  } catch (error) {
    console.error("保存书签失败", error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "保存书签失败",
    } satisfies SaveActionResponse;
  }
}

const EMPTY_BOOKMARK_GROUP_TEMPLATE: Omit<BookmarkGroupData, "id" | "sort"> = {
  name: "新建书签组",
  emphasized: false,
  description: "双击修改组名和说明",
  bookmarks: [],
};

const NEW_BOOKMARK_TEMPLATE: Omit<BookmarkData, "id" | "sort"> = {
  name: "Openwrt",
  href: "https://openwrt.meow/",
  icon: "network",
  description: "网关",
};

function renumberGroups(groups: BookmarkGroupData[]) {
  return groups.map((group, index) => ({
    ...group,
    sort: index,
  }));
}

function renumberBookmarks(bookmarks: BookmarkData[]) {
  return bookmarks.map((bookmark, index) => ({
    ...bookmark,
    sort: index,
  }));
}

/**
 * 比较服务器原始数据与当前尚未保存的数据，
 * 只生成真正需要 INSERT / UPDATE / DELETE 的记录。
 */
function createBookmarkEditChanges(
  original: BookmarkGroupData[],
  current: BookmarkGroupData[],
): BookmarkEditChanges {
  const originalGroups = new Map(original.map((group) => [group.id, group]));
  const currentGroups = new Map(current.map((group) => [group.id, group]));

  const changes: BookmarkEditChanges = {
    groups: {
      create: [],
      update: [],
      delete: [],
    },
    bookmarks: {
      create: [],
      update: [],
      delete: [],
    },
  };

  /*
   * 书签组：
   *
   * 原始不存在 + 当前 id < 0 => INSERT
   * 原始存在 + 当前存在但内容不同 => UPDATE
   */
  for (const group of current) {
    if (group.id < 0) {
      const { bookmarks: _bookmarks, ...groupRecord } = group;
      changes.groups.create.push(groupRecord);
      continue;
    }

    const originalGroup = originalGroups.get(group.id);

    if (!originalGroup) {
      throw new Error(`找不到原始书签组：${group.id}`);
    }

    if (
      group.sort !== originalGroup.sort ||
      group.name !== originalGroup.name ||
      group.emphasized !== originalGroup.emphasized ||
      group.description !== originalGroup.description
    ) {
      const { bookmarks: _bookmarks, ...groupRecord } = group;
      changes.groups.update.push(groupRecord);
    }
  }

  /*
   * 原始存在 + 当前不存在 => DELETE
   */
  for (const group of original) {
    if (!currentGroups.has(group.id)) {
      changes.groups.delete.push(group.id);
    }
  }

  type BookmarkLocation = {
    groupId: number;
    bookmark: BookmarkData;
  };

  const originalBookmarks = new Map<number, BookmarkLocation>();
  const currentBookmarks = new Map<number, BookmarkLocation>();

  for (const group of original) {
    for (const bookmark of group.bookmarks) {
      originalBookmarks.set(bookmark.id, {
        groupId: group.id,
        bookmark,
      });
    }
  }

  for (const group of current) {
    for (const bookmark of group.bookmarks) {
      currentBookmarks.set(bookmark.id, {
        groupId: group.id,
        bookmark,
      });
    }
  }

  /*
   * 书签：
   *
   * 原始不存在 + 当前 id < 0 => INSERT
   * 原始存在 + 当前存在但字段 / 所属组 / sort 不同 => UPDATE
   */
  for (const { groupId, bookmark } of currentBookmarks.values()) {
    if (bookmark.id < 0) {
      changes.bookmarks.create.push({
        groupId,
        bookmark,
      });
      continue;
    }

    const originalBookmark = originalBookmarks.get(bookmark.id);

    if (!originalBookmark) {
      throw new Error(`找不到原始书签：${bookmark.id}`);
    }

    if (
      groupId !== originalBookmark.groupId ||
      bookmark.sort !== originalBookmark.bookmark.sort ||
      bookmark.name !== originalBookmark.bookmark.name ||
      bookmark.href !== originalBookmark.bookmark.href ||
      bookmark.icon !== originalBookmark.bookmark.icon ||
      bookmark.description !== originalBookmark.bookmark.description
    ) {
      changes.bookmarks.update.push({
        groupId,
        bookmark,
      });
    }
  }

  /*
   * 原始存在 + 当前不存在 => DELETE
   */
  for (const bookmarkId of originalBookmarks.keys()) {
    if (!currentBookmarks.has(bookmarkId)) {
      changes.bookmarks.delete.push(bookmarkId);
    }
  }

  return changes;
}

function hasBookmarkChanges(changes: BookmarkEditChanges) {
  return (
    changes.groups.create.length > 0 ||
    changes.groups.update.length > 0 ||
    changes.groups.delete.length > 0 ||
    changes.bookmarks.create.length > 0 ||
    changes.bookmarks.update.length > 0 ||
    changes.bookmarks.delete.length > 0
  );
}

function reorderGroups(
  groups: BookmarkGroupData[],
  sourceGroupId: number,
  targetGroupId: number,
  position: "before" | "after",
) {
  if (sourceGroupId === targetGroupId) {
    return groups;
  }

  const sourceIndex = groups.findIndex((group) => group.id === sourceGroupId);
  const targetIndex = groups.findIndex((group) => group.id === targetGroupId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return groups;
  }

  const nextGroups = [...groups];
  const [movedGroup] = nextGroups.splice(sourceIndex, 1);

  if (!movedGroup) {
    return groups;
  }

  const nextTargetIndex = nextGroups.findIndex(
    (group) => group.id === targetGroupId,
  );

  if (nextTargetIndex < 0) {
    return groups;
  }

  const insertIndex =
    position === "after" ? nextTargetIndex + 1 : nextTargetIndex;

  nextGroups.splice(insertIndex, 0, movedGroup);

  return renumberGroups(nextGroups);
}

function reorderBookmarks(
  groups: BookmarkGroupData[],
  dragState: Extract<DragState, { kind: "bookmark" }>,
) {
  if (dragState.targetGroupId === null || dragState.position === null) {
    return groups;
  }

  const sourceGroupIndex = groups.findIndex(
    (group) => group.id === dragState.sourceGroupId,
  );

  const targetGroupIndex = groups.findIndex(
    (group) => group.id === dragState.targetGroupId,
  );

  if (sourceGroupIndex < 0 || targetGroupIndex < 0) {
    return groups;
  }

  const nextGroups = groups.map((group) => ({
    ...group,
    bookmarks: [...group.bookmarks],
  }));

  const sourceBookmarks = nextGroups[sourceGroupIndex]?.bookmarks;

  if (!sourceBookmarks) {
    return groups;
  }

  const sourceBookmarkIndex = sourceBookmarks.findIndex(
    (bookmark) => bookmark.id === dragState.sourceBookmarkId,
  );

  if (sourceBookmarkIndex < 0) {
    return groups;
  }

  const [movedBookmark] = sourceBookmarks.splice(sourceBookmarkIndex, 1);

  if (!movedBookmark) {
    return groups;
  }

  const targetBookmarks = nextGroups[targetGroupIndex]?.bookmarks;

  if (!targetBookmarks) {
    return groups;
  }

  let insertIndex = targetBookmarks.length;

  if (dragState.position !== "end") {
    const targetBookmarkIndex = targetBookmarks.findIndex(
      (bookmark) => bookmark.id === dragState.targetBookmarkId,
    );

    if (targetBookmarkIndex < 0) {
      return groups;
    }

    insertIndex =
      dragState.position === "after"
        ? targetBookmarkIndex + 1
        : targetBookmarkIndex;
  }

  targetBookmarks.splice(insertIndex, 0, movedBookmark);

  const affectedGroupIds = new Set([
    dragState.sourceGroupId,
    dragState.targetGroupId,
  ]);

  return nextGroups.map((group) =>
    affectedGroupIds.has(group.id)
      ? {
          ...group,
          bookmarks: renumberBookmarks(group.bookmarks),
        }
      : group,
  );
}

export default function EditPage({ loaderData }: Route.ComponentProps) {
  const [bookmarkData, setBookmarkData] = useState<BookmarkGroupData[]>(() =>
    structuredClone(loaderData.bookmarkdata),
  );

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [dragState, setDragState] = useState<DragState>(null);

  // 所有新增的书签组 / 书签共用这一组临时 ID。
  // -1, -2, -3 ...，绝不会和数据库正数 ID 冲突。
  const nextTempIdRef = useRef(-1);

  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveFetcher = useFetcher<SaveActionResponse>();

  const clearDeleteTimer = useCallback(() => {
    if (deleteTimerRef.current !== null) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  }, []);

  const requestDelete = useCallback(
    (target: DeleteTarget) => {
      // 同一时间页面上只能存在一个确认气泡。
      clearDeleteTimer();

      setDeleteTarget(target);

      deleteTimerRef.current = setTimeout(() => {
        setDeleteTarget(null);
        deleteTimerRef.current = null;
      }, 3000);
    },
    [clearDeleteTimer],
  );

  const confirmDelete = useCallback(
    (target: DeleteTarget) => {
      clearDeleteTimer();
      setDeleteTarget(null);
      setDragState(null);

      setBookmarkData((current) => {
        if (target.kind === "group") {
          return renumberGroups(
            current.filter((group) => group.id !== target.groupId),
          );
        }

        return current.map((group) => {
          if (group.id !== target.groupId) {
            return group;
          }

          return {
            ...group,
            bookmarks: renumberBookmarks(
              group.bookmarks.filter(
                (bookmark) => bookmark.id !== target.bookmarkId,
              ),
            ),
          };
        });
      });
    },
    [clearDeleteTimer],
  );

  const addGroup = useCallback(() => {
    const id = nextTempIdRef.current;
    nextTempIdRef.current -= 1;

    setBookmarkData((current) => [
      ...current,
      {
        id,
        sort: current.length,
        ...EMPTY_BOOKMARK_GROUP_TEMPLATE,
      },
    ]);
  }, []);

  const addBookmark = useCallback((groupId: number) => {
    const id = nextTempIdRef.current;
    nextTempIdRef.current -= 1;

    setBookmarkData((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              bookmarks: [
                ...group.bookmarks,
                {
                  id,
                  sort: group.bookmarks.length,
                  ...NEW_BOOKMARK_TEMPLATE,
                },
              ],
            }
          : group,
      ),
    );
  }, []);

  const changeGroup = useCallback(
    (groupId: number, changes: Partial<EditableBookmarkGroupFields>) => {
      setBookmarkData((current) =>
        current.map((group) =>
          group.id === groupId ? { ...group, ...changes } : group,
        ),
      );
    },
    [],
  );

  const toggleGroupEmphasized = useCallback((groupId: number) => {
    setBookmarkData((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              emphasized: !group.emphasized,
            }
          : group,
      ),
    );
  }, []);

  const changeBookmark = useCallback(
    (
      groupId: number,
      bookmarkId: number,
      changes: Partial<EditableBookmarkFields>,
    ) => {
      setBookmarkData((current) =>
        current.map((group) =>
          group.id === groupId
            ? {
                ...group,
                bookmarks: group.bookmarks.map((bookmark) =>
                  bookmark.id === bookmarkId
                    ? { ...bookmark, ...changes }
                    : bookmark,
                ),
              }
            : group,
        ),
      );
    },
    [],
  );

  const startGroupDrag = useCallback((groupId: number) => {
    setDragState({
      kind: "group",
      sourceGroupId: groupId,
      targetGroupId: null,
      position: null,
    });
  }, []);

  const dragOverGroup = useCallback(
    (groupId: number, position: "before" | "after") => {
      setDragState((current) =>
        current?.kind === "group"
          ? {
              ...current,
              targetGroupId: groupId,
              position,
            }
          : current,
      );
    },
    [],
  );

  const startBookmarkDrag = useCallback(
    (groupId: number, bookmarkId: number) => {
      setDragState({
        kind: "bookmark",
        sourceGroupId: groupId,
        sourceBookmarkId: bookmarkId,
        targetGroupId: null,
        targetBookmarkId: null,
        position: null,
      });
    },
    [],
  );

  const dragOverBookmark = useCallback(
    (groupId: number, bookmarkId: number, position: "before" | "after") => {
      setDragState((current) =>
        current?.kind === "bookmark"
          ? {
              ...current,
              targetGroupId: groupId,
              targetBookmarkId: bookmarkId,
              position,
            }
          : current,
      );
    },
    [],
  );

  const dragOverBookmarkEnd = useCallback((groupId: number) => {
    setDragState((current) =>
      current?.kind === "bookmark"
        ? {
            ...current,
            targetGroupId: groupId,
            targetBookmarkId: null,
            position: "end",
          }
        : current,
    );
  }, []);

  /**
   * dragover 阶段只改 dragState。
   * 真正修改 bookmarkData 只发生在 drop。
   */
  const commitDrag = useCallback(() => {
    setBookmarkData((current) => {
      if (!dragState) {
        return current;
      }

      if (
        dragState.kind === "group" &&
        dragState.targetGroupId !== null &&
        dragState.position !== null
      ) {
        return reorderGroups(
          current,
          dragState.sourceGroupId,
          dragState.targetGroupId,
          dragState.position,
        );
      }

      if (dragState.kind === "bookmark") {
        return reorderBookmarks(current, dragState);
      }

      return current;
    });

    setDragState(null);
  }, [dragState]);

  const endDrag = useCallback(() => {
    setDragState(null);
  }, []);

  const save = useCallback(() => {
    const changes = createBookmarkEditChanges(
      loaderData.bookmarkdata,
      bookmarkData,
    );

    if (!hasBookmarkChanges(changes) || saveFetcher.state !== "idle") {
      return;
    }

    saveFetcher.submit(
      { changes },
      {
        method: "post",
        encType: "application/json",
      },
    );
  }, [bookmarkData, loaderData.bookmarkdata, saveFetcher]);

  useEffect(() => {
    if (saveFetcher.data?.ok) {
      setBookmarkData(structuredClone(saveFetcher.data.bookmarkdata));
    }
  }, [saveFetcher.data]);

  useEffect(() => {
    return () => clearDeleteTimer();
  }, [clearDeleteTimer]);

  const groupElements = bookmarkData.map((group) => (
    <BookmarkGroupEdit
      key={group.id}
      bookmarkGroupData={group}
      dragState={dragState}
      deleteTarget={deleteTarget}
      onGroupChange={changeGroup}
      onToggleEmphasized={toggleGroupEmphasized}
      onAddBookmark={addBookmark}
      onDeleteRequest={requestDelete}
      onDeleteConfirm={confirmDelete}
      onBookmarkChange={changeBookmark}
      onGroupDragStart={startGroupDrag}
      onGroupDragOver={dragOverGroup}
      onBookmarkDragStart={startBookmarkDrag}
      onBookmarkDragOver={dragOverBookmark}
      onBookmarkDragOverEnd={dragOverBookmarkEnd}
      onDrop={commitDrag}
      onDragEnd={endDrag}
    />
  ));

  const saveError =
    saveFetcher.data && !saveFetcher.data.ok ? saveFetcher.data.error : null;

  return (
    <main>
      <h1 className="my-8 text-4xl font-bold text-primary-foreground">
        编辑书签
      </h1>

      <OptionElement
        className="flex gap-4 py-2"
        onCreateGroup={addGroup}
        onSave={save}
        saving={saveFetcher.state !== "idle"}
      />

      {saveError && (
        <div className="py-1 text-sm text-destructive-foreground">
          保存失败：{saveError}
        </div>
      )}

      {groupElements}

      <OptionElement
        className="flex gap-4 border-t-2 border-muted-border py-2"
        onCreateGroup={addGroup}
        onSave={save}
        saving={saveFetcher.state !== "idle"}
      />
    </main>
  );
}

type OptionElementProps = ComponentProps<"div"> & {
  onCreateGroup: () => void;
  onSave: () => void;
  saving: boolean;
};

function OptionElement({
  onCreateGroup,
  onSave,
  saving,
  className,
  ...restProps
}: OptionElementProps) {
  return (
    <div className={className} {...restProps}>
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

      <button
        type="button"
        className={cn(
          "ml-auto flex-none text-foreground hover:text-primary-foreground",
          "transform duration-200",
        )}
        onClick={onCreateGroup}
      >
        [＋新建书签组]
      </button>

      <button
        type="button"
        className={cn(
          "flex-none text-foreground hover:text-primary-foreground disabled:opacity-50",
          "transform duration-200",
        )}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? "[保存中…]" : "[保存]"}
      </button>
    </div>
  );
}
