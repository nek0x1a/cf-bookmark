import { cn } from "cn";
import { useCallback, useEffect, useRef, useState } from "react";

type EditableFieldProps = {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  validate?: (value: string) => string | null;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
};

export default function EditableField({
  value,
  onChange,
  multiline = false,
  placeholder = "",
  validate,
  className,
  inputClassName,
  displayClassName,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrorTimer = useCallback(() => {
    if (errorTimerRef.current !== null) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  const showError = useCallback(
    (message: string) => {
      clearErrorTimer();

      setError(message);

      errorTimerRef.current = setTimeout(() => {
        setError(null);
        errorTimerRef.current = null;
      }, 5000);
    },
    [clearErrorTimer],
  );

  function startEditing() {
    setDraft(value);
    setError(null);
    setEditing(true);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function commit() {
    const validationError = validate?.(draft) ?? null;

    if (validationError) {
      showError(validationError);

      // blur 无法直接 cancel，所以恢复焦点，
      // 达到“阻止离开编辑态”的效果。
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      return;
    }

    clearErrorTimer();
    setError(null);

    onChange(draft);
    setEditing(false);
  }

  useEffect(() => {
    return clearErrorTimer;
  }, [clearErrorTimer]);

  if (!editing) {
    return (
      <div
        className={cn("relative min-w-0", className)}
        onDoubleClick={startEditing}
      >
        <div className={cn("break-all", displayClassName)}>
          {value || <span className="italic">{placeholder}</span>}
        </div>
      </div>
    );
  }

  const fieldClassName = cn(
    "block w-full min-w-0 border border-muted-border bg-transparent",
    "px-1 py-0.5 outline-none focus:border-foreground",
    "break-all",
    inputClassName,
  );

  const setInputRef = (
    element: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    inputRef.current = element;
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      {multiline ? (
        <textarea
          ref={setInputRef}
          className={fieldClassName}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          ref={setInputRef}
          className={fieldClassName}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
        />
      )}

      {error && (
        <div className="absolute bottom-full left-0 z-20 mb-1 whitespace-nowrap rounded border border-destructive-border bg-background px-2 py-1 text-xs text-destructive-foreground shadow">
          {error}
        </div>
      )}
    </div>
  );
}
