import { cn } from "cn";
import { useEffect } from "react";

type ToastProps = {
  message: string;
  variant?: "success" | "error" | "info";
  duration?: number;
  onDismiss: () => void;
};

export default function Toast({
  message,
  variant = "info",
  duration = 3000,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 z-50 -translate-x-1/2",
        "rounded-md border bg-background px-4 py-2 shadow-lg",
        "text-sm",
        variant === "success" &&
          "border-primary-foreground text-primary-foreground",
        variant === "error" &&
          "border-destructive-foreground text-destructive-foreground",
        variant === "info" && "border-border text-foreground",
      )}
      role="status"
    >
      {message}
    </div>
  );
}
