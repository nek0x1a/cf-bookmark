import { env } from "cloudflare:workers";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { BookmarkGroupEdit } from "~/components/Bookmark/BookmarkEdit";
import { getBookmarks } from "~/db/d1";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import type { Route } from "./+types/edit";

const DRAG_EXCLUDED_SELECTOR =
  "button, input, textarea, select, option, a, [contenteditable='true']";

const DROP_HIT_SLOP = 32;
const DROP_INDICATOR_HEIGHT = 6;
const DROP_EDGE_OFFSET = 6;

type DragState = {
  groupId: BookmarkGroupData["id"];
  groupIndex: number;
  pointerId: number;

  /**
   * 鼠标指针在拖动元素中的相对位置。
   * 保证拖动预览不会突然跳到左上角。
   */
  offsetX: number;
  offsetY: number;

  width: number;
  height: number;
};

type DropTarget = {
  /**
   * 插入槽：
   *
   * 0                  第一个 Group 之前
   * 1                  第一个和第二个之间
   * ...
   * groups.length      最后一个 Group 之后
   */
  index: number;

  /**
   * 插入指示器的 viewport 坐标。
   */
  left: number;
  top: number;
  width: number;
  height: number;
};

type GroupRect = {
  groupId: BookmarkGroupData["id"];
  index: number;
  rect: DOMRect;
};

function isSameDropTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }

  return a.index === b.index;
}

function getDistanceToRect(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): number {
  const distanceX = Math.max(rect.left - clientX, 0, clientX - rect.right);

  const distanceY = Math.max(rect.top - clientY, 0, clientY - rect.bottom);

  return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: "编辑书签" },
    { name: "description", content: "书签编辑页面" },
  ];
}

export async function loader() {
  const db = env.DB;
  const bookmarkdata = await getBookmarks(db);

  return { bookmarkdata: [...bookmarkdata] };
}

export default function EditBookmark({ loaderData }: Route.ComponentProps) {
  const [bookmarkData, setBookmarkData] = useState(
    structuredClone(loaderData.bookmarkdata),
  );

  /**
   * 当前正在拖动的 Group。
   */
  const [draggingGroupId, setDraggingGroupId] = useState<
    BookmarkGroupData["id"] | null
  >(null);

  /**
   * 鼠标位置的拖动预览框。
   */
  const [dragPreview, setDragPreview] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  /**
   * 当前插入槽。
   */
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  /**
   * 所有 BookmarkGroupEdit 的 DOM 节点。
   */
  const groupRefs = useRef(new Map<BookmarkGroupData["id"], HTMLDivElement>());

  /**
   * 拖动状态放进 ref，
   * 避免 pointermove 每次触发时都重新创建监听器。
   */
  const dragStateRef = useRef<DragState | null>(null);

  /**
   * 插入槽也使用 ref 保存，
   * pointerup 时直接取得最新值。
   */
  const dropTargetRef = useRef<DropTarget | null>(null);

  /**
   * 更新单个书签。
   */
  const handleBookmarkChange = (
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
  };

  /**
   * 更新 BookmarkGroup。
   */
  const handleBookmarkGroupChange = (
    groupId: BookmarkGroupData["id"],
    changes: Partial<Pick<BookmarkGroupData, "emphasized">>,
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
  };

  /**
   * 开始拖动 BookmarkGroup。
   */
  const handleGroupPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    groupId: BookmarkGroupData["id"],
  ) => {
    if (event.button !== 0 || draggingGroupId !== null) {
      return;
    }

    /**
     * 不能从可交互元素开始拖动，
     * 否则会与 BookmarkField 的编辑以及 Star 按钮点击冲突。
     */
    if (
      event.target instanceof Element &&
      event.target.closest(DRAG_EXCLUDED_SELECTOR)
    ) {
      return;
    }

    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const groupIndex = Number(element.dataset.groupIndex);

    if (!Number.isInteger(groupIndex)) {
      return;
    }

    dragStateRef.current = {
      groupId,
      groupIndex,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };

    dropTargetRef.current = null;

    setDraggingGroupId(groupId);

    setDragPreview({
      left: event.clientX - (event.clientX - rect.left),
      top: event.clientY - (event.clientY - rect.top),
      width: rect.width,
      height: rect.height,
    });

    setDropTarget(null);

    element.setPointerCapture(event.pointerId);

    event.preventDefault();
  };

  useEffect(() => {
    if (draggingGroupId === null) {
      return;
    }

    const clearDragState = () => {
      dragStateRef.current = null;
      dropTargetRef.current = null;

      setDraggingGroupId(null);
      setDragPreview(null);
      setDropTarget(null);
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    /**
     * 根据鼠标位置寻找唯一的 insertion slot。
     *
     * 每两个 Group 之间只存在一个 slot：
     *
     * A | slot 1 | B
     *
     * 不再区分：
     * after A
     * before B
     */
    const getDropTarget = (
      clientX: number,
      clientY: number,
    ): DropTarget | null => {
      const drag = dragStateRef.current;

      if (!drag) {
        return null;
      }

      const groupRects: GroupRect[] = [];

      for (const [groupId, element] of groupRefs.current) {
        if (groupId === drag.groupId) {
          continue;
        }

        const index = Number(element.dataset.groupIndex);

        if (!Number.isInteger(index)) {
          continue;
        }

        groupRects.push({
          groupId,
          index,
          rect: element.getBoundingClientRect(),
        });
      }

      if (groupRects.length === 0) {
        return null;
      }

      /**
       * 原始 Group 数量。
       *
       * 因为拖动中的 Group 被排除，所以需要把它自己的
       * index 也考虑进去。
       */
      const groupCount =
        Math.max(drag.groupIndex, ...groupRects.map((group) => group.index)) +
        1;

      let nearestSlot: number | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      /**
       * 根据鼠标与 Group 的距离，
       * 找到最近的 Group。
       *
       * 鼠标位于 Group 上半部分 -> before
       * 鼠标位于 Group 下半部分 -> after
       *
       * 但是两者最终都会转换成同一个 slot index。
       */
      for (const group of groupRects) {
        const distance = getDistanceToRect(clientX, clientY, group.rect);

        if (distance > DROP_HIT_SLOP) {
          continue;
        }

        const isBefore = clientY < group.rect.top + group.rect.height / 2;

        const slotIndex = isBefore ? group.index : group.index + 1;

        /**
         * 当前 Group 前后两个 slot 都等于“原位置”，
         * 不显示无意义的插入指示器。
         */
        if (
          slotIndex === drag.groupIndex ||
          slotIndex === drag.groupIndex + 1
        ) {
          continue;
        }

        if (distance >= nearestDistance) {
          continue;
        }

        nearestDistance = distance;
        nearestSlot = slotIndex;
      }

      if (nearestSlot === null) {
        return null;
      }
      /**
       * 根据 slot 两侧的 Group 计算指示器位置。
       *
       * 中间：
       *     取前一个 Group bottom 和后一个 Group top 的中点。
       *
       * 首部：
       *     放在第一个 Group 上方，并保留一点距离。
       *
       * 尾部：
       *     放在最后一个 Group 下方，并保留一点距离。
       */
      const groupByIndex = new Map(
        groupRects.map((group) => [group.index, group]),
      );

      const previousGroup = groupByIndex.get(nearestSlot - 1);
      const nextGroup = groupByIndex.get(nearestSlot);

      /**
       * 第一个 Group 之前。
       */
      if (nearestSlot === 0) {
        if (!nextGroup) {
          return null;
        }

        return {
          index: nearestSlot,
          left: nextGroup.rect.left,
          top: nextGroup.rect.top - DROP_EDGE_OFFSET - DROP_INDICATOR_HEIGHT,
          width: nextGroup.rect.width,
          height: DROP_INDICATOR_HEIGHT,
        };
      }

      /**
       * 最后一个 Group 之后。
       */
      if (nearestSlot === groupCount) {
        if (!previousGroup) {
          return null;
        }

        return {
          index: nearestSlot,
          left: previousGroup.rect.left,
          top: previousGroup.rect.bottom + DROP_EDGE_OFFSET,
          width: previousGroup.rect.width,
          height: DROP_INDICATOR_HEIGHT,
        };
      }

      /**
       * 两个 Group 之间。
       */
      if (!previousGroup || !nextGroup) {
        return null;
      }

      /**
       * 两个 Group 在同一列时，
       * 指示器放在它们实际 gap 的正中央。
       */
      const sameColumn =
        Math.abs(previousGroup.rect.left - nextGroup.rect.left) < 2;

      if (sameColumn) {
        const gapCenter =
          previousGroup.rect.bottom +
          (nextGroup.rect.top - previousGroup.rect.bottom) / 2;

        return {
          index: nearestSlot,
          left: previousGroup.rect.left,
          top: gapCenter - DROP_INDICATOR_HEIGHT / 2,
          width: previousGroup.rect.width,
          height: DROP_INDICATOR_HEIGHT,
        };
      }

      /**
       * 如果这个 slot 横跨 CSS Columns 的列边界，
       * 就不能把它当成普通的垂直 gap。
       *
       * 此时使用后一个 Group 顶部作为视觉锚点，
       * 并留出一点距离。
       */
      return {
        index: nearestSlot,
        left: nextGroup.rect.left,
        top: nextGroup.rect.top - DROP_EDGE_OFFSET - DROP_INDICATOR_HEIGHT,
        width: nextGroup.rect.width,
        height: DROP_INDICATOR_HEIGHT,
      };
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

      const nextDropTarget = getDropTarget(event.clientX, event.clientY);

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

      if (target) {
        setBookmarkData((currentData) => {
          const sortedGroups = [...currentData].sort((a, b) => a.sort - b.sort);

          const movedIndex = sortedGroups.findIndex(
            (group) => group.id === drag.groupId,
          );

          if (movedIndex === -1) {
            return currentData;
          }

          /**
           * 如果 slot 正好位于当前元素前后，
           * 实际上没有发生移动。
           */
          if (target.index === movedIndex || target.index === movedIndex + 1) {
            return currentData;
          }

          const nextGroups = [...sortedGroups];

          const [movedGroup] = nextGroups.splice(movedIndex, 1);

          if (!movedGroup) {
            return currentData;
          }

          /**
           * target.index 是删除拖动元素之前的 slot。
           *
           * 如果被拖动元素原本位于 slot 前面，
           * 删除它以后 slot index 要减一。
           */
          let insertIndex = target.index;

          if (movedIndex < target.index) {
            insertIndex -= 1;
          }

          nextGroups.splice(insertIndex, 0, movedGroup);

          /**
           * 根据新的顺序重新生成 sort。
           */
          return nextGroups.map((group, index) => ({
            ...group,
            sort: index,
          }));
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
  }, [draggingGroupId]);

  const groupElement = [...bookmarkData]
    .sort((a, b) => a.sort - b.sort)
    .map((group, index) => (
      <BookmarkGroupEdit
        bookmarkGroupData={group}
        key={group.id}
        ref={(element) => {
          if (element) {
            groupRefs.current.set(group.id, element);
          } else {
            groupRefs.current.delete(group.id);
          }
        }}
        data-group-index={index}
        className={
          draggingGroupId === group.id
            ? "opacity-40 cursor-grabbing"
            : "cursor-grab"
        }
        onPointerDown={(event) => {
          handleGroupPointerDown(event, group.id);
        }}
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
      {/* 拖动中的半透明预览。 pointer-events-none 很重要， 否则它会挡住下面的鼠标事件 */}
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
      {/* 唯一的插入指示器，一个 slot 只对应一个指示器 */}
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
