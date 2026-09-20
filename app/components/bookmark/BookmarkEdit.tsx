import { cn } from "cn";
import { GripVertical, Trash } from "lucide-react";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import type { ComponentProps } from "react";
import type { BookmarkData } from "~/types/bookmark";

function isIconName(value: string): value is IconName {
  return iconNames.includes(value as IconName);
}

export default function BookmarkEdit({
  bookmarkData,
  emphasized = false,
  className,
  ...restProps
}: {
  bookmarkData: BookmarkData;
  emphasized?: boolean;
} & ComponentProps<"div">) {
  const normalizedIcon = bookmarkData.icon.toLowerCase();
  const iconElement = isIconName(normalizedIcon) ? (
    <DynamicIcon name={normalizedIcon} size="1rem" />
  ) : null;
  return (
    <div
      className={cn(
        "bookmark-edit-grid-columns",
        "py-1",
        "justify-between items-center",
        "border-b border-muted-border last:border-b-0",
        className,
      )}
      {...restProps}
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
      {/* 书签图标 */}
      <div className="flex justify-center">{iconElement}</div>
      {/* 书签图标字段 */}
      <div
        className={cn(
          "break-all",
          "text-muted-foreground hover:text-foreground",
          "transform duration-200",
        )}
      >
        {bookmarkData.icon}
      </div>
      {/* 书签名 */}
      <div
        className={cn(
          "break-all",
          "text-foreground hover:text-primary-foreground",
          "transform duration-200",
        )}
      >
        {bookmarkData.name}
      </div>
      {/* 书签链接 */}
      <div
        className={cn(
          bookmarkData.href ? "text-foreground" : "text-muted-foreground",
          "italic hover:text-primary-foreground",
          "break-all",
          "transform duration-200",
        )}
      >
        {bookmarkData.href || "暂无链接"}
      </div>
      {/* 书签说明 */}
      <div
        className={cn(
          !bookmarkData.description && "italic",
          "break-all",
          "text-muted-foreground hover:text-foreground",
          "transform duration-200",
        )}
      >
        {bookmarkData.description || "暂无描述"}
      </div>
      <div
        className={cn(
          "flex justify-center",
          "text-muted-foreground hover:text-destructive-foreground",
          "transform duration-200",
        )}
      >
        <Trash size="1rem" />
      </div>
    </div>
  );
}
