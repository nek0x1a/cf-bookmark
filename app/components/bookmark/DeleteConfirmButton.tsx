import { cn } from "cn";
import { Trash } from "lucide-react";

type DeleteConfirmButtonProps = {
  confirmed: boolean;
  onClick: () => void;
  size?: string;
};

export default function DeleteConfirmButton({
  confirmed,
  onClick,
  size = "1rem",
}: DeleteConfirmButtonProps) {
  return (
    <div className="relative flex justify-center">
      {confirmed && (
        <div className="absolute bottom-full right-0 z-20 mb-1 whitespace-nowrap rounded border border-muted-border bg-background px-2 py-1 text-xs text-foreground shadow">
          确认删除？
        </div>
      )}

      <button
        type="button"
        className={cn(
          "flex justify-center text-muted-foreground hover:text-destructive-foreground",
          "transform duration-200",
        )}
        aria-label="删除"
        onClick={onClick}
      >
        <Trash size={size} />
      </button>
    </div>
  );
}
