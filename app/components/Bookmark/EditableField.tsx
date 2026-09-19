import { cn } from "cn";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

export type EditableFieldProps = {
  value: string;
  className?: string;
  multiline?: boolean;
  onConfirm: (value: string) => void;
};

const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
};

export default function EditableField({
  value,
  className = "",
  multiline = false,
  onConfirm,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(value);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Keyboard 操作会导致 input / textarea 随后触发 blur。
   *
   * 使用这个 ref 避免：
   * - Escape 取消后又被 blur 确认
   * - Enter 确认后又被 blur 重复确认
   */
  const skipBlurRef = useRef(false);

  const startEditing = () => {
    skipBlurRef.current = false;

    setEditingValue(value);
    setEditing(true);
  };

  const cancelEditing = () => {
    skipBlurRef.current = true;

    setEditingValue(value);
    setEditing(false);
  };

  const confirmEditing = () => {
    skipBlurRef.current = true;

    onConfirm(editingValue);
    setEditing(false);
  };

  const handleBlur = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }

    confirmEditing();
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const element = event.currentTarget;

    if (element instanceof HTMLTextAreaElement) {
      adjustTextareaHeight(element);
    }

    setEditingValue(element.value);
  };

  useEffect(() => {
    if (!editing) {
      return;
    }

    if (!multiline) {
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    const textarea = textareaRef.current;

    if (textarea) {
      adjustTextareaHeight(textarea);
      textarea.focus();
      textarea.select();
    }
  }, [editing, multiline]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      confirmEditing();
    }
  };

  if (editing) {
    if (!multiline) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editingValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          data-drag-blocked="true"
          className={cn(
            className,
            "w-full px-1",
            "bg-muted outline-none rounded",
          )}
        />
      );
    }

    return (
      <textarea
        ref={textareaRef}
        value={editingValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        data-drag-blocked="true"
        className={cn(
          className,
          "w-full px-1",
          "bg-muted outline-none rounded",
          "resize-none",
        )}
      />
    );
  }

  return (
    <button
      type="button"
      data-drag-blocked="true"
      className={cn(
        "w-full block bg-transparent",
        "text-left",
        className,
        !value ? "border border-muted border-dashed rounded" : "",
        !value ? "text-muted-foreground px-2" : "",
      )}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onDoubleClick={startEditing}
    >
      {value ? value : "添加内容"}
    </button>
  );
}
