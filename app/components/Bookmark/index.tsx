import { cn } from "cn";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import type { ComponentProps } from "react";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";

function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

export default function Bookmark({
  bookmarkData,
  emphasized = false,
  ...restProps
}: {
  bookmarkData: BookmarkData;
  emphasized?: boolean;
} & ComponentProps<"a">) {
  const iconSize = emphasized ? "2rem" : "1rem";
  const normalizedIcon = bookmarkData.icon.toLowerCase();
  const iconName: IconName = isIconName(normalizedIcon) ? normalizedIcon : "x";
  const iconElement = isIconName(normalizedIcon) ? (
    <DynamicIcon name={iconName} size={iconSize} />
  ) : null;

  const bookmarkElement = emphasized ? (
    <>
      <div
        className={cn(
          "w-8 overflow-hidden",
          "flex-none flex items-center justify-center",
        )}
      >
        {iconElement}
      </div>
      <div>
        <div className="text-primary-foreground">{bookmarkData.name}</div>
        {bookmarkData.description ? (
          <div className="text-xs">{bookmarkData.description}</div>
        ) : null}
      </div>
    </>
  ) : (
    <>
      <div
        className={cn(
          "w-4 overflow-hidden",
          "flex-none flex items-center justify-center",
        )}
      >
        {iconElement}
      </div>
      <div>{bookmarkData.name}</div>
    </>
  );
  return (
    <a href={bookmarkData.href} target="_blank" rel="noreferrer" {...restProps}>
      <div
        className={cn(
          "p-2 rounded-md",
          "flex gap-2",
          "hover:bg-background-hover",
          "transition duration-150",
        )}
      >
        {bookmarkElement}
      </div>
    </a>
  );
}

export function BookmarkGroup({
  bookmarkGroupData,
  ...restProps
}: { bookmarkGroupData: BookmarkGroupData } & ComponentProps<"div">) {
  const bookmarkElement = bookmarkGroupData.bookmarks.map((bookmark) => {
    return (
      <Bookmark
        bookmarkData={bookmark}
        emphasized={bookmarkGroupData.emphasized}
        key={bookmark.id}
      ></Bookmark>
    );
  });

  return bookmarkGroupData.emphasized ? (
    <div {...restProps}>
      <h2
        className={cn(
          "col-start-1 -col-end-1",
          "text-3xl font-bold text-primary-foreground",
        )}
      >
        {bookmarkGroupData.name}
      </h2>
      {bookmarkElement}
    </div>
  ) : (
    <div {...restProps}>
      <h2 className={cn("mt-0 mb-2", "text-lg text-primary-foreground")}>
        {bookmarkGroupData.name}
      </h2>
      <div className="flex flex-col gap-x-2">{bookmarkElement}</div>
    </div>
  );
}
