import { cn } from "cn";
import { Trash } from "lucide-react";
import { type ComponentPropsWithoutRef, useState } from "react";

type ConfirmDeleteButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "onClick" | "type"
> & {
  onConfirm: () => void;
};

export default function ConfirmDeleteButton({
  className,
  onConfirm,
  ...restProps
}: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    if (confirming) {
      setConfirming(false);
      onConfirm();
      return;
    }

    setConfirming(true);
  };

  return (
    <span className="relative block flex-none">
      {confirming && (
        <span
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1",
            "-translate-x-1/2 whitespace-nowrap",
            "rounded-md border border-border bg-background",
            "px-2 py-1 text-xs text-foreground shadow-md",
          )}
        >
          确认删除？
        </span>
      )}

      <button
        {...restProps}
        type="button"
        data-drag-blocked="true"
        className={cn(
          "block",
          "text-destructive-foreground hover:text-destructive-foreground-hover",
          "transform duration-200",
          className,
        )}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={handleClick}
        aria-label={confirming ? "再次点击确认删除" : "删除"}
      >
        <Trash size="1rem" />
      </button>
    </span>
  );
}
