import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";

export const DRAG_BLOCKED_SELECTOR = "[data-drag-blocked='true']";

const DROP_HIT_SLOP = 32;
const DROP_INDICATOR_HEIGHT = 6;
const DROP_EDGE_OFFSET = 6;

export function isDragBlockedTarget(target: EventTarget | null) {
  return (
    target instanceof Element && target.closest(DRAG_BLOCKED_SELECTOR) !== null
  );
}

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

type MeasuredGroupElement = GroupElement & {
  rect: DOMRect;
};

type MeasuredBookmarkElement = BookmarkElement & {
  rect: DOMRect;
};

function distanceToRect(clientX: number, clientY: number, rect: DOMRect) {
  const x = Math.max(rect.left - clientX, 0, clientX - rect.right);

  const y = Math.max(rect.top - clientY, 0, clientY - rect.bottom);

  return Math.sqrt(x * x + y * y);
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

function createBookmarkSlotTarget(
  groupId: BookmarkGroupData["id"],
  slot: number,
  bookmarks: MeasuredBookmarkElement[],
): BookmarkDropTarget | null {
  if (bookmarks.length === 0) {
    return null;
  }

  const previous = [...bookmarks]
    .filter((bookmark) => bookmark.index < slot)
    .sort((a, b) => a.index - b.index)
    .at(-1);

  const next = bookmarks
    .filter((bookmark) => bookmark.index >= slot)
    .sort((a, b) => a.index - b.index)[0];

  /**
   * 第一个 Bookmark 之前。
   */
  if (slot === 0 && next) {
    return {
      type: "bookmark",
      groupId,
      index: slot,
      left: next.rect.left,
      top: next.rect.top - DROP_EDGE_OFFSET - DROP_INDICATOR_HEIGHT,
      width: next.rect.width,
      height: DROP_INDICATOR_HEIGHT,
    };
  }

  const last = bookmarks.at(-1);

  /**
   * 最后一个 Bookmark 之后。
   */
  if (last && slot === last.index + 1) {
    return {
      type: "bookmark",
      groupId,
      index: slot,
      left: last.rect.left,
      top: last.rect.bottom + DROP_EDGE_OFFSET,
      width: last.rect.width,
      height: DROP_INDICATOR_HEIGHT,
    };
  }

  /**
   * 两个 Bookmark 之间。
   *
   * 无论这个 slot 最初是通过：
   *
   *   前一个 Bookmark 的 after
   *
   * 还是：
   *
   *   后一个 Bookmark 的 before
   *
   * 得到的，最终都统一落到这里。
   */
  if (previous && next) {
    const gapCenter =
      previous.rect.bottom + (next.rect.top - previous.rect.bottom) / 2;

    return {
      type: "bookmark",
      groupId,
      index: slot,
      left: previous.rect.left,
      top: gapCenter - DROP_INDICATOR_HEIGHT / 2,
      width: previous.rect.width,
      height: DROP_INDICATOR_HEIGHT,
    };
  }

  return null;
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

    /**
     * 当前 Group 的原位置前后两个 slot
     * 都不是有效的移动位置。
     */
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
   * 指示器放在两者 gap 的正中央。
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
   * CSS Columns 的列边界：
   *
   * 同一个逻辑 slot 两边的元素不在同一列，
   * 此时无法取真实的垂直 gap，
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
  const candidates: MeasuredBookmarkElement[] = [...bookmarks.values()]
    .filter((bookmark) => bookmark.bookmarkId !== drag.bookmarkId)
    .map((bookmark) => ({
      ...bookmark,
      rect: bookmark.element.getBoundingClientRect(),
    }));

  /**
   * 第一阶段：
   *
   * 先寻找鼠标附近的 Bookmark，
   * 从而确定用户当前意图进入哪个 slot。
   */
  let nearest: MeasuredBookmarkElement | null = null;

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
     * 拖动元素自己的原始位置：
     *
     *      A
     *   [drag]
     *      B
     *
     * A 后面的 slot
     * 和 B 前面的 slot
     * 都是同一个“不移动”位置。
     */
    if (isNoOpBookmarkSlot(drag, bookmark.groupId, slot)) {
      continue;
    }

    minDistance = distance;
    nearest = bookmark;
    nearestSlot = slot;
  }

  if (nearest && nearestSlot !== null) {
    const sameGroupBookmarks = candidates
      .filter((bookmark) => bookmark.groupId === nearest.groupId)
      .sort((a, b) => a.index - b.index);

    /**
     * 注意：
     *
     * 不再根据 nearest.rect 判断
     * “before / after” 后直接定位。
     *
     * 所有情况都通过 slot 统一计算，
     * 从而保证同一个 slot 只有一个
     * 几何位置。
     */
    return createBookmarkSlotTarget(
      nearest.groupId,
      nearestSlot,
      sameGroupBookmarks,
    );
  }

  /**
   * 第二阶段：
   *
   * 如果鼠标位于 Group header、
   * Group 空白区域或者空 Group，
   * 使用 Group 作为 fallback。
   */
  let nearestGroup: MeasuredGroupElement | null = null;

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
    .filter((bookmark) => bookmark.groupId === nearestGroup.groupId)
    .sort((a, b) => a.index - b.index);

  /**
   * 空 Group：
   *
   * 只有一个有效 slot：0。
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
   *
   * 根据鼠标位置确定 slot。
   */
  const nextBookmark = groupBookmarks.find(
    (bookmark) => clientY < bookmark.rect.top,
  );

  const lastBookmark = groupBookmarks.at(-1);

  if (!lastBookmark) {
    return null;
  }

  const slot = nextBookmark?.index ?? lastBookmark.index + 1;

  if (isNoOpBookmarkSlot(drag, nearestGroup.groupId, slot)) {
    return null;
  }

  /**
   * 和前面的逻辑完全相同：
   *
   * 这里也不直接使用 nextBookmark / lastBookmark
   * 来决定最终位置，而是统一通过 slot 计算。
   */
  return createBookmarkSlotTarget(nearestGroup.groupId, slot, groupBookmarks);
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
