"use client";

import { useRef, useState } from "react";
import styles from "./InlineTextCell.module.css";

export type InlineTextMove = "down" | "right" | null;

interface InlineTextCellProps {
  label: string;
  value: string;
  /** When omitted, the field is always an input (Layout Uses). */
  isEditing?: boolean;
  autoFocus?: boolean;
  dataAttributes?: Record<string, string>;
  onBeginEdit?: () => void;
  onCancel?: () => void;
  onCommit: (value: string, move: InlineTextMove) => void;
}

/**
 * A table text field that keeps one box in read and edit.
 *
 * Astryx's TextInput is taller than the label it replaces, which jumps the
 * row. These two share height, type, and width so the grid does not jitter.
 */
export function InlineTextCell({
  label,
  value,
  isEditing,
  autoFocus = false,
  dataAttributes,
  onBeginEdit,
  onCancel,
  onCommit,
}: InlineTextCellProps) {
  const alwaysEdit = isEditing === undefined;
  const editing = alwaysEdit || isEditing;
  const [draft, setDraft] = useState(value);
  const [seenValue, setSeenValue] = useState(value);
  const committed = useRef(false);
  const skipBlur = useRef(false);
  if (value !== seenValue) {
    setSeenValue(value);
    setDraft(value);
  }

  if (!editing) {
    return (
      <div className={styles.textFill}>
        <button
          {...dataAttributes}
          className={styles.read}
          type="button"
          onDoubleClick={onBeginEdit}
        >
          {value}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.textFill}>
      <input
        {...dataAttributes}
        aria-label={label}
        autoFocus={autoFocus || isEditing === true}
        className={styles.edit}
        size={1}
        value={draft}
        onBlur={() => {
          if (skipBlur.current) {
            skipBlur.current = false;
            return;
          }
          if (committed.current) {
            committed.current = false;
            return;
          }
          onCommit(draft, null);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => {
          if (alwaysEdit) event.currentTarget.select();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            if (alwaysEdit) {
              skipBlur.current = true;
              setDraft(value);
              event.currentTarget.blur();
              return;
            }
            onCancel?.();
          }
          if (event.key === "Enter") {
            event.preventDefault();
            committed.current = true;
            onCommit(draft, alwaysEdit ? null : "down");
            if (alwaysEdit) event.currentTarget.blur();
          }
          if (event.key === "Tab" && !alwaysEdit) {
            event.preventDefault();
            committed.current = true;
            onCommit(draft, "right");
          }
        }}
      />
    </div>
  );
}
