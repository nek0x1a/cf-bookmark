import { Star } from "lucide-react";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import type { ComponentProps } from "react";
import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";

function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

export default function BookmarkEdit({
  bookmarkData,
  ...restProps
}: {
  bookmarkData: BookmarkData;
} & ComponentProps<"div">) {
  const normalizedIcon = bookmarkData.icon.toLowerCase();
  const iconName: IconName = isIconName(normalizedIcon) ? normalizedIcon : "x";
  const iconElement = isIconName(normalizedIcon) ? (
    <DynamicIcon name={iconName} size="2rem" />
  ) : null;

  return (
    <div {...restProps}>
      <div className="flex gap-2 px-4 py-2 hover:bg-slate-900 transition duration-150">
        <div className="w-8 overflow-hidden flex-none flex items-center justify-center">
          {iconElement}
        </div>
        <div className="w-full">
          <div className="flex gap-2 justify-between">
            <div className="flex-none text-emphasized">{bookmarkData.name}</div>
            <div className="flex-none text-description">
              {bookmarkData.icon}
            </div>
          </div>
          <div className="text-description">{bookmarkData.href}</div>
          {bookmarkData.description ? (
            <div className="text-xs text-description">
              {bookmarkData.description}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BookmarkGroupEdit({
  bookmarkGroupData,
  ...restProps
}: { bookmarkGroupData: BookmarkGroupData } & ComponentProps<"div">) {
  const bookmarkElement = bookmarkGroupData.bookmarks
    .sort((bookmark) => bookmark.sort)
    .map((bookmark) => {
      return (
        <BookmarkEdit bookmarkData={bookmark} key={bookmark.id}></BookmarkEdit>
      );
    });
  return (
    <div
      className={
        bookmarkGroupData.emphasized
          ? "border border-amber-500 hover:border-amber-400 rounded-md duration-200"
          : "border border-slate-500 hover:border-slate-400 rounded-md duration-200"
      }
      {...restProps}
    >
      <div className="p-4 flex gap-2 justify-between">
        <h2 className="flex-none col-start-1 -col-end-1 text-3xl text-normal">
          {bookmarkGroupData.name}
        </h2>
        <div className="flex-none">
          <span
            className={
              bookmarkGroupData.emphasized
                ? "text-amber-500 hover:text-amber-300"
                : "text-slate-100 hover:text-amber-300"
            }
          >
            <Star size="1rem" />
          </span>
        </div>
      </div>

      {bookmarkElement}
    </div>
  );
}
