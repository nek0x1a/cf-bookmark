import type { ComponentProps } from "react";

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
  name: string;
  icon: string;
  description?: string;
  emphasized?: boolean;
} & ComponentProps<"a">) {
  const bookmarkElement = emphasized ? (
    <>
      <div className="w-10 overflow-hidden flex-none content-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-emphasized">{name}</div>
        {description ? <div className="text-xs">{description}</div> : null}
      </div>
    </>
  ) : (
    <>
      <div className="w-6 overflow-hidden flex-none content-center justify-center">
        {icon}
      </div>
      <div className="text-normal">{name}</div>
    </>
  );
  return (
    <a href={href} target="_blank" rel="noreferrer">
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
