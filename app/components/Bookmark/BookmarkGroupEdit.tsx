import { cn } from "cn";
import { Star } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import BookmarkEdit from "./BookmarkEdit";

type BookmarkChange = (
  bookmarkId: BookmarkData["id"],
  changes: Partial<
    Pick<BookmarkData, "name" | "href" | "icon" | "description">
  >,
) => void;

type BookmarkGroupChange = (
  groupId: BookmarkGroupData["id"],
  changes: Partial<Pick<BookmarkGroupData, "emphasized">>,
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
        "mb-4 border",
        bookmarkGroupData.emphasized
          ? "border-primary-foreground hover:border-primary-foreground-hover"
          : "border-border hover:border-border-hover",
        "rounded-md duration-200",
        "break-inside-avoid",
        className,
      )}
    >
      <div className="p-4 ">
        <div className="flex gap-2 justify-between">
          <h2 className="flex-none text-3xl">{bookmarkGroupData.name}</h2>

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

          <div className="flex-none ml-auto">
            <button
              type="button"
              className={cn(
                bookmarkGroupData.emphasized
                  ? "text-primary-foreground hover:text-primary-foreground-hover"
                  : "text-muted-foreground hover:text-primary-foreground-hover",
              )}
              onClick={() => {
                onBookmarkGroupChange(bookmarkGroupData.id, {
                  emphasized: !bookmarkGroupData.emphasized,
                });
              }}
            >
              <Star size="1rem" />
            </button>
          </div>
        </div>
        <div>{bookmarkGroupData.description}</div>
      </div>

      {bookmarkElement}
    </div>
  );
});

BookmarkGroupEdit.displayName = "BookmarkGroupEdit";
