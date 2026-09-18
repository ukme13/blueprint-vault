"use client";

import { InlineTextCell } from "../InlineTextCell";

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

/** Spreadsheet text cell: read until a deliberate edit, then the same box. */
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
  return (
    <InlineTextCell
      autoFocus={isEditing}
      dataAttributes={{
        "data-semantic-cell": cell,
        "data-semantic-token": tokenId,
      }}
      isEditing={isEditing}
      label={label}
      value={value}
      onBeginEdit={onBeginEdit}
      onCancel={onCancel}
      onCommit={onCommit}
    />
  );
}
