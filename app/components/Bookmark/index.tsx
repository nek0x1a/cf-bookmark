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
      <div className="w-8 overflow-hidden flex-none flex items-center justify-center">
        {iconElement}
      </div>
      <div>
        <div className="text-emphasized">{bookmarkData.name}</div>
        {bookmarkData.description ? (
          <div className="text-xs">{bookmarkData.description}</div>
        ) : null}
      </div>
    </>
  ) : (
    <>
      <div className="w-4 overflow-hidden flex-none flex items-center justify-center">
        {iconElement}
      </div>
      <div className="text-normal">{bookmarkData.name}</div>
    </>
  );
  return (
    <a href={bookmarkData.href} target="_blank" rel="noreferrer" {...restProps}>
      <div className="flex gap-2 rounded-md p-2 hover:bg-slate-900 transition duration-150">
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
      <h2 className="col-start-1 -col-end-1 text-3xl font-bold text-emphasized">
        {bookmarkGroupData.name}
      </h2>
      {bookmarkElement}
    </div>
  ) : (
    <div {...restProps}>
      <h2 className="text-lg mt-0 mb-2 text-emphasized">
        {bookmarkGroupData.name}
      </h2>
      <div className="flex flex-col gap-x-2">{bookmarkElement}</div>
    </div>
  );
}
