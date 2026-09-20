import { cn } from "cn";
import { GripVertical } from "lucide-react";
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
} & ComponentProps<"li">) {
  const normalizedIcon = bookmarkData.icon.toLowerCase();
  const iconElement = isIconName(normalizedIcon) ? (
    <DynamicIcon name={normalizedIcon} size="1rem" />
  ) : null;
  return (
    <li className={cn("", className)} {...restProps}>
      <div
        className={cn(
          "py-1 ml-8",
          "flex gap-2",
          "justify-between items-center",
          "border-b border-muted-border",
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
        {/* 书签图标 */}
        <div className="flex-none">{iconElement}</div>
        {/* 书签图标字段 */}
        <div
          className={cn(
            "flex-1",
            "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
        >
          {bookmarkData.icon}
        </div>
        {/* 书签名 */}
        <div
          className={cn(
            "flex-1",
            "text-foreground hover:text-primary-foreground",
            "transform duration-200",
          )}
        >
          {bookmarkData.name}
        </div>
        {/* 书签链接 */}
        <div
          className={cn(
            "flex-2",
            "text-foreground hover:text-primary-foreground",
            "transform duration-200",
          )}
        >
          {bookmarkData.href || "暂无链接"}
        </div>
        {/* 书签说明 */}
        <div
          className={cn(
            "flex-2",
            "text-muted-foreground hover:text-foreground",
            "transform duration-200",
          )}
        >
          {bookmarkData.description || "暂无描述"}
        </div>
      </div>
    </li>
  );
}
