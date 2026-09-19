import { cn } from "cn";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BookmarkData } from "~/types/bookmark";
import ConfirmDeleteButton from "./ConfirmDeleteButton";
import EditableField from "./EditableField";

type BookmarkChange = (
  bookmarkId: BookmarkData["id"],
  changes: Partial<
    Pick<BookmarkData, "name" | "href" | "icon" | "description">
  >,
) => void;

type BookmarkDelete = (bookmarkId: BookmarkData["id"]) => void;

type BookmarkEditProps = {
  bookmarkData: BookmarkData;
  onBookmarkChange: BookmarkChange;
  onBookmarkDelete: BookmarkDelete;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
} & ComponentPropsWithoutRef<"div">;

function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

const BookmarkEdit = forwardRef<HTMLDivElement, BookmarkEditProps>(
  function BookmarkEdit(
    {
      bookmarkData,
      onBookmarkChange,
      onBookmarkDelete,
      className,
      onPointerDown,
      ...restProps
    },
    ref,
  ) {
    const normalizedIcon = bookmarkData.icon.toLowerCase();

    const iconName: IconName = isIconName(normalizedIcon)
      ? normalizedIcon
      : "x";

    const iconElement = isIconName(normalizedIcon) ? (
      <DynamicIcon name={iconName} size="2rem" />
    ) : null;

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event);

      /**
       * Bookmark 本身负责处理 Bookmark drag，
       * 所以这里不能再让 pointerdown 冒泡给
       * BookmarkGroupEdit。
       *
       * EditableField 自己会在更内层阻止事件，
       * ConfirmDeleteButton 也会阻止事件，
       * 因而不会启动 Bookmark drag。
       */
      if (onPointerDown) {
        event.stopPropagation();
      }
    };

    return (
      <div
        ref={ref}
        data-bookmark-item="true"
        className={cn(
          "flex flex-col gap-2",
          "hover:bg-background-hover",
          "transition duration-150",
          className,
        )}
        onPointerDown={handlePointerDown}
        {...restProps}
      >
        <div className="flex gap-2">
          <div
            className={cn(
              "w-8 overflow-hidden",
              "flex flex-none",
              "items-center justify-center",
            )}
          >
            {iconElement}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-primary-foreground">
              <EditableField
                value={bookmarkData.name}
                className="text-primary-foreground"
                onConfirm={(value) => {
                  onBookmarkChange(bookmarkData.id, {
                    name: value,
                  });
                }}
              />
            </div>

            <div className={cn("flex-none", "text-xs text-muted-foreground")}>
              <EditableField
                value={bookmarkData.icon}
                className="text-muted-foreground"
                onConfirm={(value) => {
                  onBookmarkChange(bookmarkData.id, {
                    icon: value,
                  });
                }}
              />
            </div>
          </div>

          <div className="flex-none ml-auto">
            <div className="flex gap-2 flex-col items-center">
              <span
                className={cn(
                  "px-1",
                  "block flex-none",
                  "text-xs text-muted",
                  "border border-muted rounded-sm",
                )}
              >
                {bookmarkData.sort + 1}
              </span>

              <ConfirmDeleteButton
                onConfirm={() => {
                  onBookmarkDelete(bookmarkData.id);
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex-none">
          <EditableField
            value={bookmarkData.href}
            className="text-foreground break-all"
            multiline
            onConfirm={(value) => {
              onBookmarkChange(bookmarkData.id, {
                href: value,
              });
            }}
          />
        </div>

        <div className="flex-none">
          <EditableField
            value={bookmarkData.description}
            className="text-foreground break-all"
            multiline
            onConfirm={(value) => {
              onBookmarkChange(bookmarkData.id, {
                description: value,
              });
            }}
          />
        </div>
      </div>
    );
  },
);

BookmarkEdit.displayName = "BookmarkEdit";

export default BookmarkEdit;
