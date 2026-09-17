import { cn } from "cn";
import { Star } from "lucide-react";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import type { ComponentProps } from "react";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";
import type { EditableField } from "./BookmarkField";
import BookmarkField from "./BookmarkField";

type BookmarkChange = (
  bookmarkId: BookmarkData["id"],
  changes: Partial<Pick<BookmarkData, EditableField>>,
) => void;

type BookmarkGroupChange = (
  groupId: BookmarkGroupData["id"],
  changes: Partial<Pick<BookmarkGroupData, "emphasized">>,
) => void;

function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

export default function BookmarkEdit({
  bookmarkData,
  onBookmarkChange,
  ...restProps
}: {
  bookmarkData: BookmarkData;
  onBookmarkChange: BookmarkChange;
} & ComponentProps<"div">) {
  const normalizedIcon = bookmarkData.icon.toLowerCase();
  const iconName: IconName = isIconName(normalizedIcon) ? normalizedIcon : "x";
  const iconElement = isIconName(normalizedIcon) ? (
    <DynamicIcon name={iconName} size="2rem" />
  ) : null;

  return (
    <div
      className={cn(
        "px-4 py-2",
        "flex flex-col gap-2",
        "hover:bg-background-hover",
        "transition duration-150",
      )}
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
        <div className="flex-none">
          <span
            className={cn(
              "px-1",
              "text-xs text-muted",
              "border border-muted rounded-sm",
            )}
          >
            {bookmarkData.sort + 1}
          </span>
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
}

export function BookmarkGroupEdit({
  bookmarkGroupData,
  onBookmarkChange,
  onBookmarkGroupChange,
  ...restProps
}: {
  bookmarkGroupData: BookmarkGroupData;
  onBookmarkChange: BookmarkChange;
  onBookmarkGroupChange: BookmarkGroupChange;
} & ComponentProps<"div">) {
  const bookmarkElement = [...bookmarkGroupData.bookmarks]
    .sort((a, b) => a.sort - b.sort)
    .map((bookmark) => (
      <BookmarkEdit
        bookmarkData={bookmark}
        key={bookmark.id}
        onBookmarkChange={onBookmarkChange}
      />
    ));

  return (
    <div
      className={cn(
        "mb-4 border",
        bookmarkGroupData.emphasized
          ? "border-primary-foreground hover:border-primary-foreground-hover"
          : "border-border hover:border-border-hover",
        "rounded-md duration-200",
        "break-inside-avoid",
      )}
      {...restProps}
    >
      <div className="p-4 flex gap-2 justify-between">
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

      {bookmarkElement}
    </div>
  );
}
