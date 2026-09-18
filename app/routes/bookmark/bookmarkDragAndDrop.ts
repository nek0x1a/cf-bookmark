import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";

export const DRAG_EXCLUDED_SELECTOR =
  "button, input, textarea, select, option, a, [contenteditable='true']";

const DROP_HIT_SLOP = 32;
const DROP_INDICATOR_HEIGHT = 6;
const DROP_EDGE_OFFSET = 6;

type DragBox = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export type DragPreview = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GroupDragState = DragBox & {
  type: "group";
  groupId: BookmarkGroupData["id"];
  groupIndex: number;
};

export type BookmarkDragState = DragBox & {
  type: "bookmark";
  bookmarkId: BookmarkData["id"];
  groupId: BookmarkGroupData["id"];
  bookmarkIndex: number;
};

export type DragState = GroupDragState | BookmarkDragState;

type DropBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GroupDropTarget = DropBox & {
  type: "group";
  index: number;
};

export type BookmarkDropTarget = DropBox & {
  type: "bookmark";
  groupId: BookmarkGroupData["id"];
  index: number;
};

export type DropTarget = GroupDropTarget | BookmarkDropTarget;

export type GroupElement = {
  groupId: BookmarkGroupData["id"];
  index: number;
  element: HTMLDivElement;
};

export type BookmarkElement = {
  bookmarkId: BookmarkData["id"];
  groupId: BookmarkGroupData["id"];
  index: number;
  element: HTMLDivElement;
};

function distanceToRect(clientX: number, clientY: number, rect: DOMRect) {
  const x = Math.max(rect.left - clientX, 0, clientX - rect.right);
  const y = Math.max(rect.top - clientY, 0, clientY - rect.bottom);

  return Math.sqrt(x * x + y * y);
}

function normalizeBookmarks(bookmarks: BookmarkData[]) {
  return bookmarks.map((bookmark, index) => ({
    ...bookmark,
    sort: index,
  }));
}

function isNoOpBookmarkSlot(
  drag: BookmarkDragState,
  groupId: BookmarkGroupData["id"],
  index: number,
) {
  return (
    drag.groupId === groupId &&
    (index === drag.bookmarkIndex || index === drag.bookmarkIndex + 1)
  );
}

export function isSameDropTarget(a: DropTarget | null, b: DropTarget | null) {
  if (a === null || b === null) {
    return a === b;
  }

  if (a.type !== b.type) {
    return false;
  }

  if (a.type === "group" && b.type === "group") {
    return a.index === b.index;
  }

  if (a.type === "bookmark" && b.type === "bookmark") {
    return a.groupId === b.groupId && a.index === b.index;
  }

  return false;
}

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

  return groups.map((group, index) => ({
    ...group,
    sort: index,
  }));
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
   * target.index 是“删除拖动元素之前”的 slot。
   * 如果被拖动元素位于 target 前面，
   * 删除后实际插入位置要减一。
   */
  if (sourceGroup.id === targetGroup.id) {
    const insertIndex =
      fromIndex < target.index ? target.index - 1 : target.index;

    sourceBookmarks.splice(insertIndex, 0, movedBookmark);

    return currentData.map((group) =>
      group.id === sourceGroup.id
        ? {
            ...group,
            bookmarks: normalizeBookmarks(sourceBookmarks),
          }
        : group,
    );
  }

  /**
   * 跨组移动：
   *
   * 源组移除并重新编号，
   * 目标组插入并重新编号。
   */
  const targetBookmarks = [...targetGroup.bookmarks].sort(
    (a, b) => a.sort - b.sort,
  );

  targetBookmarks.splice(target.index, 0, movedBookmark);

  return currentData.map((group) => {
    if (group.id === sourceGroup.id) {
      return {
        ...group,
        bookmarks: normalizeBookmarks(sourceBookmarks),
      };
    }

    if (group.id === targetGroup.id) {
      return {
        ...group,
        bookmarks: normalizeBookmarks(targetBookmarks),
      };
    }

    return group;
  });
}

function createBookmarkTarget(
  groupId: BookmarkGroupData["id"],
  index: number,
  rect: DOMRect,
  before: boolean,
): BookmarkDropTarget {
  return {
    type: "bookmark",
    groupId,
    index,
    left: rect.left,
    top: before
      ? rect.top - DROP_EDGE_OFFSET - DROP_INDICATOR_HEIGHT
      : rect.bottom + DROP_EDGE_OFFSET,
    width: rect.width,
    height: DROP_INDICATOR_HEIGHT,
  };
}

function getGroupDropTarget(
  clientX: number,
  clientY: number,
  drag: GroupDragState,
  groups: Map<BookmarkGroupData["id"], GroupElement>,
): GroupDropTarget | null {
  const candidates = [...groups.values()]
    .filter((group) => group.groupId !== drag.groupId)
    .map((group) => ({
      ...group,
      rect: group.element.getBoundingClientRect(),
    }));

  let slot: number | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const group of candidates) {
    const distance = distanceToRect(clientX, clientY, group.rect);

    if (distance > DROP_HIT_SLOP || distance >= minDistance) {
      continue;
    }

    const before = clientY < group.rect.top + group.rect.height / 2;

    const nextSlot = before ? group.index : group.index + 1;

    if (nextSlot === drag.groupIndex || nextSlot === drag.groupIndex + 1) {
      continue;
    }

    minDistance = distance;
    slot = nextSlot;
  }

  if (slot === null) {
    return null;
  }

  const byIndex = new Map(candidates.map((group) => [group.index, group]));

  const previous = byIndex.get(slot - 1);
  const next = byIndex.get(slot);

  const groupCount =
    Math.max(drag.groupIndex, ...candidates.map((group) => group.index)) + 1;

  /**
   * 第一个 Group 之前。
   */
  if (slot === 0 && next) {
    return {
      type: "group",
      index: slot,
      left: next.rect.left,
      top: next.rect.top - DROP_EDGE_OFFSET - DROP_INDICATOR_HEIGHT,
      width: next.rect.width,
      height: DROP_INDICATOR_HEIGHT,
    };
  }

  /**
   * 最后一个 Group 之后。
   */
  if (slot === groupCount && previous) {
    return {
      type: "group",
      index: slot,
      left: previous.rect.left,
      top: previous.rect.bottom + DROP_EDGE_OFFSET,
      width: previous.rect.width,
      height: DROP_INDICATOR_HEIGHT,
    };
  }

  if (!previous || !next) {
    return null;
  }

  /**
   * 两个 Group 在同一列时，
   * 指示器放在 gap 的正中央。
   */
  if (Math.abs(previous.rect.left - next.rect.left) < 2) {
    const gapCenter =
      previous.rect.bottom + (next.rect.top - previous.rect.bottom) / 2;

    return {
      type: "group",
      index: slot,
      left: previous.rect.left,
      top: gapCenter - DROP_INDICATOR_HEIGHT / 2,
      width: previous.rect.width,
      height: DROP_INDICATOR_HEIGHT,
    };
  }

  /**
   * 如果 slot 横跨 CSS Columns 的列边界，
   * 使用后一个 Group 顶部作为锚点。
   */
  return {
    type: "group",
    index: slot,
    left: next.rect.left,
    top: next.rect.top - DROP_EDGE_OFFSET - DROP_INDICATOR_HEIGHT,
    width: next.rect.width,
    height: DROP_INDICATOR_HEIGHT,
  };
}

function getBookmarkDropTarget(
  clientX: number,
  clientY: number,
  drag: BookmarkDragState,
  bookmarks: Map<BookmarkData["id"], BookmarkElement>,
  groups: Map<BookmarkGroupData["id"], GroupElement>,
): BookmarkDropTarget | null {
  const candidates = [...bookmarks.values()]
    .filter((bookmark) => bookmark.bookmarkId !== drag.bookmarkId)
    .map((bookmark) => ({
      ...bookmark,
      rect: bookmark.element.getBoundingClientRect(),
    }));

  /**
   * 第一阶段：
   * 优先判断鼠标附近具体的 Bookmark。
   */
  let nearest: (BookmarkElement & { rect: DOMRect }) | null = null;

  let nearestSlot: number | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const bookmark of candidates) {
    const distance = distanceToRect(clientX, clientY, bookmark.rect);

    if (distance > DROP_HIT_SLOP || distance >= minDistance) {
      continue;
    }

    const before = clientY < bookmark.rect.top + bookmark.rect.height / 2;

    const slot = before ? bookmark.index : bookmark.index + 1;

    /**
     * 原位置前后两个 slot 都不显示。
     *
     * 例如：
     *
     * A [dragged] B
     *
     * dragged 的两个原始 slot：
     * A 后面
     * B 前面
     *
     * 其实都是“没动”。
     */
    if (isNoOpBookmarkSlot(drag, bookmark.groupId, slot)) {
      continue;
    }

    minDistance = distance;
    nearest = bookmark;
    nearestSlot = slot;
  }

  if (nearest && nearestSlot !== null) {
    return createBookmarkTarget(
      nearest.groupId,
      nearestSlot,
      nearest.rect,
      nearestSlot === nearest.index,
    );
  }

  /**
   * 第二阶段：
   * 如果鼠标在 Group 的 header、
   * 空白区域或空 Group 中，
   * 则使用 Group 本身作为 fallback。
   */
  let nearestGroup: (GroupElement & { rect: DOMRect }) | null = null;

  let minGroupDistance = Number.POSITIVE_INFINITY;

  for (const group of groups.values()) {
    const rect = group.element.getBoundingClientRect();

    const distance = distanceToRect(clientX, clientY, rect);

    if (distance > DROP_HIT_SLOP || distance >= minGroupDistance) {
      continue;
    }

    minGroupDistance = distance;
    nearestGroup = {
      ...group,
      rect,
    };
  }

  if (!nearestGroup) {
    return null;
  }

  const groupBookmarks = candidates
    .filter((bookmark) => bookmark.groupId === nearestGroup?.groupId)
    .sort((a, b) => a.index - b.index);

  /**
   * 空 Group：
   * 整个 Group 只有一个插入 slot。
   */
  if (groupBookmarks.length === 0) {
    if (isNoOpBookmarkSlot(drag, nearestGroup.groupId, 0)) {
      return null;
    }

    return {
      type: "bookmark",
      groupId: nearestGroup.groupId,
      index: 0,
      left: nearestGroup.rect.left,
      top: nearestGroup.rect.bottom - DROP_EDGE_OFFSET - DROP_INDICATOR_HEIGHT,
      width: nearestGroup.rect.width,
      height: DROP_INDICATOR_HEIGHT,
    };
  }

  /**
   * 非空 Group：
   * 找到鼠标下方第一个 Bookmark。
   *
   * 它之前的 slot 就是当前插入位置。
   * 如果没有，则插到最后一个 Bookmark 后面。
   */
  const nextBookmark = groupBookmarks.find(
    (bookmark) => clientY < bookmark.rect.top,
  );

  const lastBookmark = groupBookmarks[groupBookmarks.length - 1];

  if (!lastBookmark) {
    return null;
  }

  const slot = nextBookmark?.index ?? lastBookmark.index + 1;

  if (isNoOpBookmarkSlot(drag, nearestGroup.groupId, slot)) {
    return null;
  }

  return createBookmarkTarget(
    nearestGroup.groupId,
    slot,
    nextBookmark?.rect ?? lastBookmark.rect,
    nextBookmark !== undefined,
  );
}

export function getDropTarget(
  clientX: number,
  clientY: number,
  drag: DragState,
  groups: Map<BookmarkGroupData["id"], GroupElement>,
  bookmarks: Map<BookmarkData["id"], BookmarkElement>,
): DropTarget | null {
  return drag.type === "group"
    ? getGroupDropTarget(clientX, clientY, drag, groups)
    : getBookmarkDropTarget(clientX, clientY, drag, bookmarks, groups);
}
