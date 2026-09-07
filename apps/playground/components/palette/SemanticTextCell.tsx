"use client";

import { useRef, useState } from "react";

import { TextInput } from "@astryxdesign/core/TextInput";

interface SemanticTextCellProps {
  cell: "name" | "description";
  label: string;
  tokenId: string;
  value: string;
  isEditing: boolean;
  onBeginEdit: () => void;
  onCancel: () => void;
  onCommit: (value: string, move: "down" | "right" | null) => void;
}

/** One text cell: read on one click, edit only on a deliberate spreadsheet key. */
export function SemanticTextCell({
  cell,
  label,
  tokenId,
  value,
  isEditing,
  onBeginEdit,
  onCancel,
  onCommit,
}: SemanticTextCellProps) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(false);
  if (!isEditing) {
    return (
      <button
        className="w-full truncate text-left"
        data-semantic-cell={cell}
        data-semantic-token={tokenId}
        type="button"
        onDoubleClick={onBeginEdit}
      >
        {value}
      </button>
    );
  }

  return (
    <TextInput
      hasAutoFocus
      isLabelHidden
      label={label}
      value={draft}
      onChange={setDraft}
      onBlur={() => {
        if (committed.current) {
          committed.current = false;
          return;
        }
        onCommit(draft, null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
        if (event.key === "Enter") {
          event.preventDefault();
          committed.current = true;
          onCommit(draft, "down");
        }
        if (event.key === "Tab") {
          event.preventDefault();
          committed.current = true;
          onCommit(draft, "right");
        }
      }}
    />
  );
}
