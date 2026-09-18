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
  DRAG_EXCLUDED_SELECTOR,
  type DragPreview,
  type DragState,
  type DropTarget,
  type GroupDragState,
  type GroupElement,
  getDropTarget,
  isSameDropTarget,
  moveBookmark,
  moveGroup,
} from "./bookmarkDragAndDrop";

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

    event.currentTarget.setPointerCapture(event.pointerId);

    /**
     * Group 拖拽原本就需要 preventDefault。
     *
     * Bookmark 则不能这样做：
     * BookmarkField 依赖 click / doubleClick 进入编辑状态。
     */
    if (drag.type === "group") {
      event.preventDefault();
    }
  };

  const handleGroupPointerDown: GroupPointerDownHandler = (
    event,
    groupId,
    groupIndex,
  ) => {
    if (event.button !== 0 || dragStateRef.current !== null) {
      return;
    }

    /**
     * Group 自身的交互控件不能启动 Group 拖拽。
     *
     * BookmarkEdit 还会主动 stopPropagation，
     * 这里再做一次 data attribute 检查，
     * 这样即使事件链发生变化，也不会把 Bookmark 当成 Group。
     */
    if (
      event.target instanceof Element &&
      event.target.closest(DRAG_EXCLUDED_SELECTOR)
    ) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest("[data-bookmark-item]")
    ) {
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
    if (draggingGroupId === null && draggingBookmarkId === null) {
      return;
    }

    if (dragStateRef.current === null) {
      return;
    }

    const clearDragState = () => {
      dragStateRef.current = null;
      dropTargetRef.current = null;

      setDraggingGroupId(null);
      setDraggingBookmarkId(null);
      setDragPreview(null);
      setDropTarget(null);
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

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
       * 和原来的 Group 拖拽保持一致：
       *
       * pointermove 只更新预览和 drop target，
       * 真正修改 bookmarkData 必须等 pointerup。
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

      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [draggingBookmarkId, draggingGroupId, setBookmarkData]);

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
