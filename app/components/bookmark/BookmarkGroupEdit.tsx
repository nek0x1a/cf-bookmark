import { cn } from "cn";
import { GripVertical, Plus, Star, StarOff, Trash } from "lucide-react";
import type { ComponentProps } from "react";
import type { BookmarkGroupData } from "~/types/bookmark";
import BookmarkEdit from "./BookmarkEdit";

export default function BookmarkGroupEdit({
  bookmarkGroupData,
  className,
  ...restProps
}: { bookmarkGroupData: BookmarkGroupData } & ComponentProps<"div">) {
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
    <div className={cn(className)} {...restProps}>
      <div
        className={cn(
          "py-2",
          "bookmark-group-edit-grid-columns",
          "justify-between items-center",
          "border-y-2 border-muted-border",
        )}
      >
        {/* 拖动按钮 */}
        <div
          className={cn(
            "flex justify-center",
            "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
        >
          <GripVertical />
        </div>
        {/* 重要书签组指示 */}
        <div
          className={cn(
            "flex justify-center",
            bookmarkGroupData.emphasized
              ? "text-primary-foreground hover:text-primary-foreground-hover"
              : "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
        >
          {bookmarkGroupData.emphasized ? <Star size="1.5rem" /> : <StarOff />}
        </div>
        {/* 书签组名 */}
        <div className="text-xl text-primary-foreground font-bold">
          {bookmarkGroupData.name}
        </div>
        {/* 书签组说明 */}
        <div
          className={cn(
            !bookmarkGroupData.description && "italic",
            "break-all",
            "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
        >
          {bookmarkGroupData.description || "暂无描述"}
        </div>
        {/* 新增书签按钮 */}
        <div
          className={cn(
            "flex justify-center",
            "text-foreground hover:text-primary-foreground",
            "transform duration-200",
          )}
        >
          <Plus size="1.5rem" />
        </div>
        {/* 删除按钮 */}
        <div
          className={cn(
            "flex justify-center",
            "text-muted-foreground hover:text-destructive-foreground",
            "transform duration-200",
          )}
        >
          <Trash size="1.5rem" />
        </div>
      </div>
      <div className="ml-6">{bookmarkElements}</div>
    </div>
  );
}
