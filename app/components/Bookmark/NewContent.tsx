import { cn } from "cn";
import { CirclePlus } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * 页脚
 */
export default function NewContent({
  text = "添加新内容",
  className = "",
  children,
  ...restProps
}: { text?: string } & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        className,
        "min-h-8",
        "flex gap-2 items-center justify-center",
        "text-muted-foreground hover:text-foreground",
        "transform duration-200",
      )}
      {...restProps}
    >
      <span className="block">
        <CirclePlus />
      </span>
      <span className="block">{text}</span>
    </div>
  );
}
