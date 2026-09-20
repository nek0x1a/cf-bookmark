import { cn } from "cn";
import { GripVertical, Plus, Star, StarOff } from "lucide-react";
import type { DragEvent } from "react";

import type { BookmarkGroupData } from "~/types/bookmark";
import type {
  DeleteTarget,
  DragState,
  EditableBookmarkFields,
  EditableBookmarkGroupFields,
} from "~/types/bookmark-edit";
import { validateName } from "~/utils/bookmark-validation";

import BookmarkEdit from "./BookmarkEdit";
import DeleteConfirmButton from "./DeleteConfirmButton";
import EditableField from "./EditableField";

type BookmarkGroupEditProps = {
  bookmarkGroupData: BookmarkGroupData;
  dragState: DragState;
  deleteTarget: DeleteTarget | null;

  onGroupChange: (
    groupId: number,
    changes: Partial<EditableBookmarkGroupFields>,
  ) => void;

  onToggleEmphasized: (groupId: number) => void;

  onAddBookmark: (groupId: number) => void;

  onDeleteRequest: (target: DeleteTarget) => void;

  onDeleteConfirm: (target: DeleteTarget) => void;

  onBookmarkChange: (
    groupId: number,
    bookmarkId: number,
    changes: Partial<EditableBookmarkFields>,
  ) => void;

  onGroupDragStart: (groupId: number) => void;

  onGroupDragOver: (groupId: number, position: "before" | "after") => void;

  onBookmarkDragStart: (groupId: number, bookmarkId: number) => void;

  onBookmarkDragOver: (
    groupId: number,
    bookmarkId: number,
    position: "before" | "after",
  ) => void;

  onBookmarkDragOverEnd: (groupId: number) => void;

  onDrop: () => void;
  onDragEnd: () => void;

  className?: string;
};

function DropIndicator() {
  return <div aria-hidden className="my-1 h-0.5 bg-muted-border" />;
}

export default function BookmarkGroupEdit({
  bookmarkGroupData,
  dragState,
  deleteTarget,
  onGroupChange,
  onToggleEmphasized,
  onAddBookmark,
  onDeleteRequest,
  onDeleteConfirm,
  onBookmarkChange,
  onGroupDragStart,
  onGroupDragOver,
  onBookmarkDragStart,
  onBookmarkDragOver,
  onBookmarkDragOverEnd,
  onDrop,
  onDragEnd,
  className,
}: BookmarkGroupEditProps) {
  const groupDeleteTarget: DeleteTarget = {
    kind: "group",
    groupId: bookmarkGroupData.id,
  };

  const isDragging =
    dragState?.kind === "group" &&
    dragState.sourceGroupId === bookmarkGroupData.id;

  const showGroupBefore =
    dragState?.kind === "group" &&
    dragState.sourceGroupId !== bookmarkGroupData.id &&
    dragState.targetGroupId === bookmarkGroupData.id &&
    dragState.position === "before";

  const showGroupAfter =
    dragState?.kind === "group" &&
    dragState.sourceGroupId !== bookmarkGroupData.id &&
    dragState.targetGroupId === bookmarkGroupData.id &&
    dragState.position === "after";

  const groupDeleteConfirmed =
    deleteTarget?.kind === "group" &&
    deleteTarget.groupId === bookmarkGroupData.id;

  const showBookmarkEnd =
    dragState?.kind === "bookmark" &&
    dragState.sourceGroupId !== bookmarkGroupData.id &&
    dragState.targetGroupId === bookmarkGroupData.id &&
    dragState.position === "end";

  function handleGroupDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(bookmarkGroupData.id));

    onGroupDragStart(bookmarkGroupData.id);
  }

  function handleGroupDragOver(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "group") {
      return;
    }

    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();

    const position =
      event.clientY < rect.top + rect.height / 2 ? "before" : "after";

    onGroupDragOver(bookmarkGroupData.id, position);
  }

  /**
   * 在组标题上拖动书签：
   * 默认表示“放到该组末尾”。
   */
  function handleHeaderDragOver(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "bookmark") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onBookmarkDragOverEnd(bookmarkGroupData.id);
  }

  function handleHeaderDrop(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "bookmark") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onDrop();
  }

  /**
   * 组最底部是：
   * 1. 空组的书签插入点
   * 2. 有书签时的“末尾”插入点
   * 3. 书签组排序时的“after”插入点
   */
  function handleEndDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (dragState?.kind === "bookmark") {
      onBookmarkDragOverEnd(bookmarkGroupData.id);
    } else if (dragState?.kind === "group") {
      onGroupDragOver(bookmarkGroupData.id, "after");
    }
  }

  function handleEndDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    onDrop();
  }

  return (
    <div
      className={cn(
        "min-w-0",
        isDragging &&
          "outline-2 outline-dashed outline-muted-border opacity-60",
        className,
      )}
      onDragOver={handleGroupDragOver}
      onDrop={(event) => {
        // 只有拖动组时这里接收 drop。
        // 书签的 drop 会由具体 BookmarkEdit / end zone 处理。
        if (dragState?.kind === "group") {
          event.preventDefault();
          onDrop();
        }
      }}
    >
      {showGroupBefore && <DropIndicator />}

      <div
        className={cn(
          "py-2",
          "bookmark-group-edit-grid-columns",
          "justify-between items-center",
          "border-y-2 border-muted-border",
        )}
        onDragOver={handleHeaderDragOver}
        onDrop={handleHeaderDrop}
      >
        {/* 拖动按钮 */}
        <button
          type="button"
          draggable
          className={cn(
            "flex cursor-grab justify-center",
            "text-muted-foreground hover:text-foreground",
            "active:cursor-grabbing",
            "transform duration-200",
          )}
          aria-label="拖动书签组"
          onDragStart={handleGroupDragStart}
          onDragEnd={onDragEnd}
        >
          <GripVertical />
        </button>

        {/* 重要书签组 */}
        <button
          type="button"
          className={cn(
            "flex justify-center",
            bookmarkGroupData.emphasized
              ? "text-primary-foreground hover:text-primary-foreground-hover"
              : "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
          aria-label={
            bookmarkGroupData.emphasized ? "取消重要书签组" : "设为重要书签组"
          }
          aria-pressed={bookmarkGroupData.emphasized}
          onClick={() => onToggleEmphasized(bookmarkGroupData.id)}
        >
          {bookmarkGroupData.emphasized ? <Star size="1.5rem" /> : <StarOff />}
        </button>

        {/* 书签组名 */}
        <EditableField
          value={bookmarkGroupData.name}
          onChange={(value) =>
            onGroupChange(bookmarkGroupData.id, { name: value })
          }
          validate={validateName}
          displayClassName="text-xl text-primary-foreground font-bold"
        />

        {/* 书签组说明 */}
        <EditableField
          value={bookmarkGroupData.description}
          onChange={(value) =>
            onGroupChange(bookmarkGroupData.id, { description: value })
          }
          multiline
          placeholder="暂无描述"
          displayClassName="text-muted-foreground hover:text-foreground transform duration-200"
        />

        {/* 新增书签 */}
        <button
          type="button"
          className={cn(
            "flex justify-center text-foreground hover:text-primary-foreground",
            "transform duration-200",
          )}
          aria-label="新增书签"
          onClick={() => onAddBookmark(bookmarkGroupData.id)}
        >
          <Plus size="1.5rem" />
        </button>

        {/* 删除组 */}
        <DeleteConfirmButton
          confirmed={groupDeleteConfirmed}
          onClick={() =>
            groupDeleteConfirmed
              ? onDeleteConfirm(groupDeleteTarget)
              : onDeleteRequest(groupDeleteTarget)
          }
          size="1.5rem"
        />
      </div>

      <div className="ml-6">
        {bookmarkGroupData.bookmarks.map((bookmark) => (
          <BookmarkEdit
            key={bookmark.id}
            groupId={bookmarkGroupData.id}
            bookmarkData={bookmark}
            dragState={dragState}
            deleteConfirmed={
              deleteTarget?.kind === "bookmark" &&
              deleteTarget.groupId === bookmarkGroupData.id &&
              deleteTarget.bookmarkId === bookmark.id
            }
            onBookmarkChange={onBookmarkChange}
            onDeleteRequest={onDeleteRequest}
            onDeleteConfirm={onDeleteConfirm}
            onBookmarkDragStart={onBookmarkDragStart}
            onBookmarkDragOver={onBookmarkDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
          />
        ))}

        <div
          className={cn("min-h-2", showBookmarkEnd && "py-0.5")}
          onDragOver={handleEndDragOver}
          onDrop={handleEndDrop}
        >
          {showBookmarkEnd && <DropIndicator />}
        </div>
      </div>

      {showGroupAfter && <DropIndicator />}
    </div>
  );
}
