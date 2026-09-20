import { cn } from "cn";
import { GripVertical, Star, StarOff } from "lucide-react";
import type { ComponentProps } from "react";
import type { BookmarkGroupData } from "~/types/bookmark";
import BookmarkEdit from "./BookmarkEdit";

export default function BookmarkGroupEdit({
  bookmarkGroupData,
  className,
  ...restProps
}: { bookmarkGroupData: BookmarkGroupData } & ComponentProps<"li">) {
  const bookmarkElements = bookmarkGroupData.bookmarks.map((bookmark) => {
    return (
      <BookmarkEdit
        bookmarkData={bookmark}
        emphasized={bookmarkGroupData.emphasized}
        key={bookmark.id}
      ></BookmarkEdit>
    );
  });

  return (
    <li className={cn(className)} {...restProps}>
      <div
        className={cn(
          "py-2",
          "flex gap-2",
          "justify-between items-center",
          "border-y-2 border-muted-border",
        )}
      >
        {/* 拖动按钮 */}
        <div
          className={cn(
            "flex-none",
            "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
        >
          <GripVertical />
        </div>
        {/* 重要书签组指示 */}
        <div
          className={cn(
            "flex-none",
            bookmarkGroupData.emphasized
              ? "text-primary-foreground hover:text-primary-foreground-hover"
              : "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
        >
          {bookmarkGroupData.emphasized ? <Star size="1.5rem" /> : <StarOff />}
        </div>
        {/* 书签组名 */}
        <div className="flex-1 text-xl text-primary-foreground font-bold">
          {bookmarkGroupData.name}
        </div>
        {/* 书签组说明 */}
        <div
          className={cn(
            "flex-2",
            "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
        >
          {bookmarkGroupData.description || "暂无描述"}
        </div>
      </div>
      <ol>{bookmarkElements}</ol>
    </li>
  );
}
