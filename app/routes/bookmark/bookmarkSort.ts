import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import type {
  BookmarkDragState,
  BookmarkDropTarget,
  GroupDragState,
  GroupDropTarget,
} from "./bookmarkDragAndDrop";

const normalizeGroupSort = (groups: BookmarkGroupData[]) =>
  groups.map((group, index) => ({
    ...group,
    sort: index,
  }));

const normalizeBookmarkSort = (bookmarks: BookmarkData[]) =>
  bookmarks.map((bookmark, index) => ({
    ...bookmark,
    sort: index,
  }));

export function moveGroup(
  currentData: BookmarkGroupData[],
  drag: GroupDragState,
  target: GroupDropTarget,
) {
  const groups = [...currentData].sort((a, b) => a.sort - b.sort);

  const fromIndex = groups.findIndex((group) => group.id === drag.groupId);

  if (
    fromIndex === -1 ||
    target.index === fromIndex ||
    target.index === fromIndex + 1
  ) {
    return currentData;
  }

  const [movedGroup] = groups.splice(fromIndex, 1);

  if (!movedGroup) {
    return currentData;
  }

  const insertIndex =
    fromIndex < target.index ? target.index - 1 : target.index;

  groups.splice(insertIndex, 0, movedGroup);

  return normalizeGroupSort(groups);
}

export function moveBookmark(
  currentData: BookmarkGroupData[],
  drag: BookmarkDragState,
  target: BookmarkDropTarget,
) {
  const sourceGroup = currentData.find((group) => group.id === drag.groupId);

  const targetGroup = currentData.find((group) => group.id === target.groupId);

  if (!sourceGroup || !targetGroup) {
    return currentData;
  }

  const sourceBookmarks = [...sourceGroup.bookmarks].sort(
    (a, b) => a.sort - b.sort,
  );

  const fromIndex = sourceBookmarks.findIndex(
    (bookmark) => bookmark.id === drag.bookmarkId,
  );

  if (fromIndex === -1) {
    return currentData;
  }

  const [movedBookmark] = sourceBookmarks.splice(fromIndex, 1);

  if (!movedBookmark) {
    return currentData;
  }

  /**
   * 同组移动：
   *
   * target.index 表示删除拖动项之前的插入 slot。
   *
   * 删除元素以后，如果原元素位于目标 slot 之前，
   * 插入位置需要减一。
   */
  if (sourceGroup.id === targetGroup.id) {
    const insertIndex =
      fromIndex < target.index ? target.index - 1 : target.index;

    sourceBookmarks.splice(insertIndex, 0, movedBookmark);

    return currentData.map((group) =>
      group.id === sourceGroup.id
        ? {
            ...group,
            bookmarks: normalizeBookmarkSort(sourceBookmarks),
          }
        : group,
    );
  }

  /**
   * 跨组移动：
   *
   * 1. 从源组删除
   * 2. 源组重新编号
   * 3. 插入目标组
   * 4. 目标组重新编号
   */
  const targetBookmarks = [...targetGroup.bookmarks].sort(
    (a, b) => a.sort - b.sort,
  );

  targetBookmarks.splice(target.index, 0, movedBookmark);

  return currentData.map((group) => {
    if (group.id === sourceGroup.id) {
      return {
        ...group,
        bookmarks: normalizeBookmarkSort(sourceBookmarks),
      };
    }

    if (group.id === targetGroup.id) {
      return {
        ...group,
        bookmarks: normalizeBookmarkSort(targetBookmarks),
      };
    }

    return group;
  });
}
