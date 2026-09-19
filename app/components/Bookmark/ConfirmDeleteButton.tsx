import { cn } from "cn";
import { Trash } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";

type ConfirmDeleteContextValue = {
  confirmingId: string | null;
  requestConfirmation: (id: string) => void;
  clearConfirmation: (id: string) => void;
};

const ConfirmDeleteContext = createContext<ConfirmDeleteContextValue | null>(
  null,
);

export function ConfirmDeleteProvider({ children }: { children: ReactNode }) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (confirmingId === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      setConfirmingId(null);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [confirmingId]);

  const requestConfirmation = (id: string) => {
    setConfirmingId(id);
  };

  const clearConfirmation = (id: string) => {
    setConfirmingId((currentId) => (currentId === id ? null : currentId));
  };

  return (
    <ConfirmDeleteContext.Provider
      value={{
        confirmingId,
        requestConfirmation,
        clearConfirmation,
      }}
    >
      {children}
    </ConfirmDeleteContext.Provider>
  );
}

function useConfirmDelete() {
  const context = useContext(ConfirmDeleteContext);

  if (!context) {
    throw new Error(
      "ConfirmDeleteButton must be rendered inside ConfirmDeleteProvider",
    );
  }

  return context;
}

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
  const confirmationId = useId();

  const { confirmingId, requestConfirmation, clearConfirmation } =
    useConfirmDelete();

  const confirming = confirmingId === confirmationId;

  const handleClick = () => {
    if (confirming) {
      clearConfirmation(confirmationId);
      onConfirm();
      return;
    }

    requestConfirmation(confirmationId);
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
