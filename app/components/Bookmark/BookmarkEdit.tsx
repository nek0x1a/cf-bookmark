import { cn } from "cn";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BookmarkData } from "~/types/bookmark";
import type { EditableField } from "./BookmarkField";
import BookmarkField from "./BookmarkField";

type BookmarkChange = (
  bookmarkId: BookmarkData["id"],
  changes: Partial<Pick<BookmarkData, EditableField>>,
) => void;

type BookmarkEditProps = {
  bookmarkData: BookmarkData;
  onBookmarkChange: BookmarkChange;
} & ComponentPropsWithoutRef<"div">;

function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

const BookmarkEdit = forwardRef<HTMLDivElement, BookmarkEditProps>(
  function BookmarkEdit(
    { bookmarkData, onBookmarkChange, className, onPointerDown, ...restProps },
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

      if (onPointerDown) {
        event.stopPropagation();
      }
    };

    return (
      <div
        ref={ref}
        data-bookmark-item="true"
        className={cn(
          "px-4 py-2",
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
              <BookmarkField
                field="name"
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
              <BookmarkField
                field="icon"
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
        </div>

        <div className="flex-none">
          <BookmarkField
            field="href"
            value={bookmarkData.href}
            className="text-foreground break-all"
            onConfirm={(value) => {
              onBookmarkChange(bookmarkData.id, {
                href: value,
              });
            }}
          />
        </div>

        <div className="flex-none">
          <BookmarkField
            field="description"
            value={bookmarkData.description}
            className="min-h-4 text-foreground break-all"
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
