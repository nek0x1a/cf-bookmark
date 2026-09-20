import { cn } from "cn";
import { GripVertical } from "lucide-react";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import type { DragEvent } from "react";

import type { BookmarkData } from "~/types/bookmark";
import type {
  DeleteTarget,
  DragState,
  EditableBookmarkFields,
} from "~/types/bookmark-edit";
import { validateHref, validateName } from "~/utils/bookmark-validation";

import DeleteConfirmButton from "./DeleteConfirmButton";
import EditableField from "./EditableField";

function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

type BookmarkEditProps = {
  groupId: number;
  bookmarkData: BookmarkData;
  dragState: DragState;
  deleteConfirmed: boolean;

  onBookmarkChange: (
    groupId: number,
    bookmarkId: number,
    changes: Partial<EditableBookmarkFields>,
  ) => void;

  onDeleteRequest: (target: DeleteTarget) => void;

  onDeleteConfirm: (target: DeleteTarget) => void;

  onBookmarkDragStart: (groupId: number, bookmarkId: number) => void;

  onBookmarkDragOver: (
    groupId: number,
    bookmarkId: number,
    position: "before" | "after",
  ) => void;

  onDrop: () => void;
  onDragEnd: () => void;

  className?: string;
};

function isBookmarkDragTarget(
  dragState: DragState,
  groupId: number,
  bookmarkId: number,
  position: "before" | "after",
) {
  return (
    dragState?.kind === "bookmark" &&
    dragState.targetGroupId === groupId &&
    dragState.targetBookmarkId === bookmarkId &&
    dragState.position === position &&
    dragState.sourceBookmarkId !== bookmarkId
  );
}

function DropIndicator() {
  return <div aria-hidden className="my-1 h-0.5 bg-muted-border" />;
}

export default function BookmarkEdit({
  groupId,
  bookmarkData,
  dragState,
  deleteConfirmed,
  onBookmarkChange,
  onDeleteRequest,
  onDeleteConfirm,
  onBookmarkDragStart,
  onBookmarkDragOver,
  onDrop,
  onDragEnd,
  className,
}: BookmarkEditProps) {
  const normalizedIcon = bookmarkData.icon.toLowerCase();

  const iconElement = isIconName(normalizedIcon) ? (
    <DynamicIcon name={normalizedIcon} size="1rem" />
  ) : null;

  const deleteTarget: DeleteTarget = {
    kind: "bookmark",
    groupId,
    bookmarkId: bookmarkData.id,
  };

  const isDragging =
    dragState?.kind === "bookmark" &&
    dragState.sourceBookmarkId === bookmarkData.id;

  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(bookmarkData.id));

    onBookmarkDragStart(groupId, bookmarkData.id);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "bookmark") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();

    const position =
      event.clientY < rect.top + rect.height / 2 ? "before" : "after";

    onBookmarkDragOver(groupId, bookmarkData.id, position);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (dragState?.kind !== "bookmark") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onDrop();
  }

  const bookmarkChange = (changes: Partial<EditableBookmarkFields>) => {
    onBookmarkChange(groupId, bookmarkData.id, changes);
  };

  return (
    <>
      {isBookmarkDragTarget(dragState, groupId, bookmarkData.id, "before") && (
        <DropIndicator />
      )}

      <div
        className={cn(
          "bookmark-edit-grid-columns",
          "py-1",
          "justify-between items-center",
          "border-b border-muted-border last:border-b-0",
          isDragging &&
            "outline-2 outline-dashed outline-muted-border opacity-60",
          className,
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 只有这个按钮具有 draggable */}
        <button
          type="button"
          draggable
          className={cn(
            "flex cursor-grab justify-center",
            "text-muted-foreground hover:text-foreground",
            "active:cursor-grabbing",
            "transform duration-200",
          )}
          aria-label="拖动书签"
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
        >
          <GripVertical />
        </button>

        {/* 书签实际图标 */}
        <div className="flex justify-center">{iconElement}</div>

        {/* icon 字段 */}
        <EditableField
          value={bookmarkData.icon}
          onChange={(value) => bookmarkChange({ icon: value })}
          placeholder="图标 id"
          displayClassName="text-muted-foreground hover:text-foreground transform duration-200"
        />

        {/* name */}
        <EditableField
          value={bookmarkData.name}
          onChange={(value) => bookmarkChange({ name: value })}
          validate={validateName}
          displayClassName="text-foreground hover:text-primary-foreground transform duration-200"
        />

        {/* href */}
        <EditableField
          value={bookmarkData.href}
          onChange={(value) => bookmarkChange({ href: value })}
          multiline
          placeholder="暂无链接"
          validate={validateHref}
          displayClassName={cn(
            bookmarkData.href ? "text-foreground" : "text-muted-foreground",
            "italic hover:text-primary-foreground transform duration-200",
          )}
        />

        {/* description */}
        <EditableField
          value={bookmarkData.description}
          onChange={(value) =>
            bookmarkChange({
              description: value,
            })
          }
          multiline
          placeholder="暂无描述"
          displayClassName="text-muted-foreground hover:text-foreground transform duration-200"
        />

        <DeleteConfirmButton
          confirmed={deleteConfirmed}
          onClick={() =>
            deleteConfirmed
              ? onDeleteConfirm(deleteTarget)
              : onDeleteRequest(deleteTarget)
          }
        />
      </div>

      {isBookmarkDragTarget(dragState, groupId, bookmarkData.id, "after") && (
        <DropIndicator />
      )}
    </>
  );
}
