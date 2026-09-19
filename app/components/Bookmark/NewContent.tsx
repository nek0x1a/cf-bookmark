import { cn } from "cn";
import { CirclePlus } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

/**
 * 新增内容按钮
 */
export default function NewContent({
  text = "添加新内容",
  className = "",
  ...restProps
}: {
  text?: string;
} & Omit<ComponentPropsWithoutRef<"button">, "type">) {
  return (
    <button
      {...restProps}
      type="button"
      data-drag-blocked="true"
      className={cn(
        className,
        "flex gap-2 items-center justify-center",
        "text-muted-foreground hover:text-foreground",
        "transform duration-200",
      )}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <span className="block">
        <CirclePlus />
      </span>
      <span className="block">{text}</span>
    </button>
  );
}
