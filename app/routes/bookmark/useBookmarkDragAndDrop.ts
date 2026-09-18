import {
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import {
  type BookmarkDragState,
  type BookmarkElement,
  type DragPreview,
  type DragState,
  type DropTarget,
  type GroupDragState,
  type GroupElement,
  getDropTarget,
  isDragBlockedTarget,
  isSameDropTarget,
} from "./bookmarkDragAndDrop";
import { moveBookmark, moveGroup } from "./bookmarkSort";

export type GroupRefCallback = (
  groupId: BookmarkGroupData["id"],
  index: number,
  element: HTMLDivElement | null,
) => void;

export type BookmarkRefCallback = (
  bookmarkId: BookmarkData["id"],
  groupId: BookmarkGroupData["id"],
  index: number,
  element: HTMLDivElement | null,
) => void;

export type BookmarkPointerDownHandler = (
  event: ReactPointerEvent<HTMLDivElement>,
  bookmarkId: BookmarkData["id"],
  groupId: BookmarkGroupData["id"],
  bookmarkIndex: number,
) => void;

export type GroupPointerDownHandler = (
  event: ReactPointerEvent<HTMLDivElement>,
  groupId: BookmarkGroupData["id"],
  groupIndex: number,
) => void;

type UseBookmarkDragAndDropOptions = {
  setBookmarkData: Dispatch<SetStateAction<BookmarkGroupData[]>>;
};

export function useBookmarkDragAndDrop({
  setBookmarkData,
}: UseBookmarkDragAndDropOptions) {
  const [draggingGroupId, setDraggingGroupId] = useState<
    BookmarkGroupData["id"] | null
  >(null);

  const [draggingBookmarkId, setDraggingBookmarkId] = useState<
    BookmarkData["id"] | null
  >(null);

  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const groupElementsRef = useRef(
    new Map<BookmarkGroupData["id"], GroupElement>(),
  );

  const bookmarkElementsRef = useRef(
    new Map<BookmarkData["id"], BookmarkElement>(),
  );

  const dragStateRef = useRef<DragState | null>(null);

  const dropTargetRef = useRef<DropTarget | null>(null);

  const bodyStyleRef = useRef<{
    userSelect: string;
    cursor: string;
  } | null>(null);

  const registerGroupRef = useCallback<GroupRefCallback>(
    (groupId, index, element) => {
      if (element) {
        groupElementsRef.current.set(groupId, {
          groupId,
          index,
          element,
        });
      } else {
        groupElementsRef.current.delete(groupId);
      }
    },
    [],
  );

  const registerBookmarkRef = useCallback<BookmarkRefCallback>(
    (bookmarkId, groupId, index, element) => {
      if (element) {
        bookmarkElementsRef.current.set(bookmarkId, {
          bookmarkId,
          groupId,
          index,
          element,
        });
      } else {
        bookmarkElementsRef.current.delete(bookmarkId);
      }
    },
    [],
  );

  const startDrag = (
    drag: DragState,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    dragStateRef.current = drag;
    dropTargetRef.current = null;

    setDraggingGroupId(drag.type === "group" ? drag.groupId : null);

    setDraggingBookmarkId(drag.type === "bookmark" ? drag.bookmarkId : null);

    setDragPreview({
      left: event.clientX - drag.offsetX,
      top: event.clientY - drag.offsetY,
      width: drag.width,
      height: drag.height,
    });

    setDropTarget(null);

    bodyStyleRef.current = {
      userSelect: document.body.style.userSelect,
      cursor: document.body.style.cursor,
    };

    document.body.style.userSelect = "none";

    document.body.style.cursor = "grabbing";

    /**
     * 到这里已经确定：
     * 当前 pointerdown 来自拖拽区域。
     *
     * 因此 preventDefault 不会影响
     * EditableField / Star 的交互。
     */
    event.preventDefault();

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleGroupPointerDown: GroupPointerDownHandler = (
    event,
    groupId,
    groupIndex,
  ) => {
    if (event.button !== 0 || dragStateRef.current !== null) {
      return;
    }

    if (isDragBlockedTarget(event.target)) {
      return;
    }

    const element = event.currentTarget;

    const rect = element.getBoundingClientRect();

    const drag: GroupDragState = {
      type: "group",
      groupId,
      groupIndex,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };

    startDrag(drag, event);
  };

  const handleBookmarkPointerDown: BookmarkPointerDownHandler = (
    event,
    bookmarkId,
    groupId,
    bookmarkIndex,
  ) => {
    if (event.button !== 0 || dragStateRef.current !== null) {
      return;
    }

    if (isDragBlockedTarget(event.target)) {
      return;
    }

    const element = event.currentTarget;

    const rect = element.getBoundingClientRect();

    const drag: BookmarkDragState = {
      type: "bookmark",
      bookmarkId,
      groupId,
      bookmarkIndex,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };

    startDrag(drag, event);
  };

  useEffect(() => {
    const restoreBodyStyle = () => {
      const previousStyle = bodyStyleRef.current;

      if (!previousStyle) {
        return;
      }

      document.body.style.userSelect = previousStyle.userSelect;

      document.body.style.cursor = previousStyle.cursor;

      bodyStyleRef.current = null;
    };
    const clearDragState = () => {
      dragStateRef.current = null;
      dropTargetRef.current = null;

      setDraggingGroupId(null);
      setDraggingBookmarkId(null);
      setDragPreview(null);
      setDropTarget(null);

      restoreBodyStyle();
    };
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;

      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      setDragPreview({
        left: event.clientX - drag.offsetX,
        top: event.clientY - drag.offsetY,
        width: drag.width,
        height: drag.height,
      });

      const nextDropTarget = getDropTarget(
        event.clientX,
        event.clientY,
        drag,
        groupElementsRef.current,
        bookmarkElementsRef.current,
      );

      if (!isSameDropTarget(dropTargetRef.current, nextDropTarget)) {
        dropTargetRef.current = nextDropTarget;

        setDropTarget(nextDropTarget);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragStateRef.current;

      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      const target = dropTargetRef.current;

      /**
       * pointermove 只负责计算：
       *
       * - drag preview
       * - drop target
       *
       * 真正的 state 修改只发生在 pointerup。
       */
      if (target) {
        setBookmarkData((currentData) => {
          if (drag.type === "group" && target.type === "group") {
            return moveGroup(currentData, drag, target);
          }

          if (drag.type === "bookmark" && target.type === "bookmark") {
            return moveBookmark(currentData, drag, target);
          }

          return currentData;
        });
      }

      clearDragState();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      const drag = dragStateRef.current;

      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      clearDragState();
    };

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener("pointerup", handlePointerUp);

    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", handlePointerUp);

      window.removeEventListener("pointercancel", handlePointerCancel);

      restoreBodyStyle();

      dragStateRef.current = null;
      dropTargetRef.current = null;
    };
  }, [setBookmarkData]);

  return {
    draggingGroupId,
    draggingBookmarkId,
    dragPreview,
    dropTarget,

    registerGroupRef,
    registerBookmarkRef,

    handleGroupPointerDown,
    handleBookmarkPointerDown,
  };
}
