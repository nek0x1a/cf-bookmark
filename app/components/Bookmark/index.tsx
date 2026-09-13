import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import type { ComponentProps } from "react";

function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

type BookmarkData = {
  name: string;
  href: string;
  icon: string;
  description?: string;
};

export default function Bookmark({
  name,
  href,
  icon,
  description,
  emphasized = false,
  ...restProps
}: {
  emphasized?: boolean;
} & BookmarkData &
  ComponentProps<"a">) {
  const iconSize = emphasized ? "2rem" : "1rem";
  const normalizedIcon = icon.toLowerCase();
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
        <div className="text-emphasized">{name}</div>
        {description ? <div className="text-xs">{description}</div> : null}
      </div>
    </>
  ) : (
    <>
      <div className="w-4 overflow-hidden flex-none flex items-center justify-center">
        {iconElement}
      </div>
      <div className="text-normal">{name}</div>
    </>
  );
  return (
    <a href={href} target="_blank" rel="noreferrer" {...restProps}>
      <div className="flex gap-2 rounded-md p-2 hover:bg-slate-900 transition duration-150">
        {bookmarkElement}
      </div>
    </a>
  );
}

export function BookmarkGroup({
  name,
  bookmarks,
  emphasized = false,
  ...restProps
}: {
  name: string;
  bookmarks: Array<BookmarkData>;
  emphasized?: boolean;
} & ComponentProps<"div">) {
  const bookmarkElement = bookmarks.map((bookmark) => {
    return (
      <Bookmark
        name={bookmark.name}
        href={bookmark.href}
        icon={bookmark.icon}
        description={bookmark.description}
        emphasized={emphasized}
        key={bookmark.name}
      ></Bookmark>
    );
  });

  return emphasized ? (
    <div {...restProps}>
      <h2 className="col-start-1 -col-end-1 text-3xl font-bold text-emphasized">
        {name}
      </h2>
      {bookmarkElement}
    </div>
  ) : (
    <div {...restProps}>
      <h2 className="text-lg mt-0 mb-2 text-emphasized">{name}</h2>
      <div className="flex flex-col gap-x-2">{bookmarkElement}</div>
    </div>
  );
}
