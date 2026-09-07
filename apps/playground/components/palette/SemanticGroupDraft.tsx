"use client";

import { useEffect, useRef } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import styles from "./semantic-table.module.css";

interface SemanticGroupDraftProps {
  count: number;
  name: string;
  onNameChange: (name: string) => void;
  onCancel: () => void;
  onCommit: (name: string) => void;
}

export function SemanticGroupDraft({
  count,
  name,
  onNameChange,
  onCancel,
  onCommit,
}: SemanticGroupDraftProps) {
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => field.current?.focus(), []);
  return (
    <div className={styles.groupDraft}>
      <TextInput
        ref={field}
        isLabelHidden
        label="New group name"
        placeholder={`Move ${count} to group…`}
        value={name}
        onChange={onNameChange}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (name.trim()) onCommit(name.trim());
        }}
      />
    </div>
  );
}
