import { cn } from "cn";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

export type EditableField = "name" | "icon" | "href" | "description";

export type EditableFieldProps = {
  field: EditableField;
  value: string;
  className?: string;
  onConfirm: (value: string) => void;
};

const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
};

export default function BookmarkField({
  field,
  value,
  className = "",
  onConfirm,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(value);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSingleLine = field === "name" || field === "icon";

  const startEditing = () => {
    setEditingValue(value);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditingValue(value);
  };

  const confirmEditing = () => {
    onConfirm(editingValue);
    setEditing(false);
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
    if (isSingleLine) {
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
  }, [editing, isSingleLine]);

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
    if (isSingleLine) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editingValue}
          onChange={handleChange}
          onBlur={confirmEditing}
          onKeyDown={handleKeyDown}
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
        onBlur={confirmEditing}
        onKeyDown={handleKeyDown}
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
      className={cn(
        "w-full block bg-transparent",
        "text-left",
        className,
        !value ? "border border-muted border-dashed rounded" : "",
      )}
      onDoubleClick={startEditing}
    >
      {value}
    </button>
  );
}
