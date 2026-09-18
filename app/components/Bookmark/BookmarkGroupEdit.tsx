import { cn } from "cn";
import { Star } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import BookmarkEdit from "./BookmarkEdit";
import EditableField from "./EditableField";

type BookmarkChange = (
  bookmarkId: BookmarkData["id"],
  changes: Partial<
    Pick<BookmarkData, "name" | "href" | "icon" | "description">
  >,
) => void;

type BookmarkGroupChange = (
  groupId: BookmarkGroupData["id"],
  changes: Partial<
    Pick<BookmarkGroupData, "name" | "description" | "emphasized">
  >,
) => void;

type BookmarkRef = (
  bookmarkId: BookmarkData["id"],
  groupId: BookmarkGroupData["id"],
  index: number,
  element: HTMLDivElement | null,
) => void;

type BookmarkGroupEditProps = {
  bookmarkGroupData: BookmarkGroupData;

  onBookmarkChange: BookmarkChange;

  onBookmarkGroupChange: BookmarkGroupChange;

  bookmarkRef?: BookmarkRef;

  onBookmarkPointerDown?: (
    event: ReactPointerEvent<HTMLDivElement>,
    bookmarkId: BookmarkData["id"],
    groupId: BookmarkGroupData["id"],
    bookmarkIndex: number,
  ) => void;

  draggingBookmarkId?: BookmarkData["id"] | null;
} & ComponentPropsWithoutRef<"div">;

export const BookmarkGroupEdit = forwardRef<
  HTMLDivElement,
  BookmarkGroupEditProps
>(function BookmarkGroupEdit(
  {
    bookmarkGroupData,
    onBookmarkChange,
    onBookmarkGroupChange,
    bookmarkRef,
    onBookmarkPointerDown,
    draggingBookmarkId,
    className,
    ...restProps
  },
  ref,
) {
  const bookmarkElement = [...bookmarkGroupData.bookmarks]
    .sort((a, b) => a.sort - b.sort)
    .map((bookmark, index) => (
      <BookmarkEdit
        ref={(element) => {
          bookmarkRef?.(bookmark.id, bookmarkGroupData.id, index, element);
        }}
        bookmarkData={bookmark}
        key={bookmark.id}
        onBookmarkChange={onBookmarkChange}
        className={cn(
          "flex-none",
          "px-4 py-2",
          draggingBookmarkId === bookmark.id
            ? "opacity-40 cursor-grabbing"
            : "cursor-grab",
        )}
        onPointerDown={(event) => {
          onBookmarkPointerDown?.(
            event,
            bookmark.id,
            bookmarkGroupData.id,
            index,
          );
        }}
      />
    ));

  return (
    <div
      ref={ref}
      {...restProps}
      className={cn(
        "mb-4 py-4 border",
        "flex gap-2 flex-col",
        bookmarkGroupData.emphasized
          ? "border-primary-foreground hover:border-primary-foreground-hover"
          : "border-border hover:border-border-hover",
        "rounded-md duration-200",
        "break-inside-avoid",
        className,
      )}
    >
      <div className="px-4 pb-2">
        <div className="flex gap-2 justify-between">
          <div className="flex flex-1 gap-2 flex-col">
            <h2 className="flex-none text-3xl">
              <EditableField
                value={bookmarkGroupData.name}
                className="text-primary-foreground"
                onConfirm={(value) => {
                  onBookmarkGroupChange(bookmarkGroupData.id, {
                    name: value,
                  });
                }}
              />
            </h2>

            <div className="flex-none">
              <EditableField
                value={bookmarkGroupData.description}
                multiline
                className="min-h-4 text-foreground break-all"
                onConfirm={(value) => {
                  onBookmarkGroupChange(bookmarkGroupData.id, {
                    description: value,
                  });
                }}
              />
            </div>
          </div>
          <div className="flex items-center flex-none flex-col">
            <div className="flex-none">
              <button
                type="button"
                data-drag-blocked="true"
                className={cn(
                  bookmarkGroupData.emphasized
                    ? "text-primary-foreground hover:text-primary-foreground-hover"
                    : "text-muted-foreground hover:text-primary-foreground-hover",
                )}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={() => {
                  onBookmarkGroupChange(bookmarkGroupData.id, {
                    emphasized: !bookmarkGroupData.emphasized,
                  });
                }}
                aria-pressed={bookmarkGroupData.emphasized}
                aria-label={
                  bookmarkGroupData.emphasized ? "取消强调" : "强调书签组"
                }
              >
                <Star size="1rem" />
              </button>
            </div>

            <div className="flex-none">
              <span
                className={cn(
                  "px-1",
                  "text-xs text-muted",
                  "border border-muted rounded-sm",
                )}
              >
                {bookmarkGroupData.sort + 1}
              </span>
            </div>
          </div>
        </div>
      </div>

      {bookmarkElement}
    </div>
  );
});

BookmarkGroupEdit.displayName = "BookmarkGroupEdit";
