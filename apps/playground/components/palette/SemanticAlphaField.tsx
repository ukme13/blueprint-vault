"use client";

import { useRef, useState } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatAlpha, parseAlpha } from "@blueprint/ui";
import styles from "./semantic-table.module.css";

interface SemanticAlphaFieldProps {
  label: string;
  mode: "light" | "dark";
  tokenId: string;
  value: number;
  onChange: (next: number) => void;
  onMove: (move: "down" | "right") => void;
}

/** A right-docked percentage field for one reference. */
export function SemanticAlphaField({
  label,
  mode,
  tokenId,
  value,
  onChange,
  onMove,
}: SemanticAlphaFieldProps) {
  const [draft, setDraft] = useState(() => formatAlpha(value));
  const [isEditing, setIsEditing] = useState(false);
  const before = useRef(value);
  const committed = useRef(false);
  const lastCommitted = useRef<number | null>(null);
  const commit = (move: "down" | "right" | null) => {
    const parsed = parseAlpha(draft);
    if (parsed === null) {
      setDraft(formatAlpha(value));
      return;
    }
    if (lastCommitted.current !== parsed) onChange(parsed);
    lastCommitted.current = parsed;
    setDraft(formatAlpha(parsed));
    if (move) onMove(move);
  };
  const nudge = (amount: number) => {
    const next = Math.min(1, Math.max(0, value + amount));
    onChange(next);
    setDraft(formatAlpha(next));
  };

  return (
    <div
      className={styles.alphaField}
      data-opaque={value >= 1 || undefined}
      data-semantic-cell={`${mode}-alpha`}
      data-semantic-token={tokenId}
    >
      <TextInput
        isLabelHidden
        label={label}
        size="sm"
        value={isEditing ? draft : formatAlpha(value)}
        onBlur={() => {
          if (committed.current) {
            committed.current = false;
            setIsEditing(false);
            return;
          }
          commit(null);
          setIsEditing(false);
        }}
        onChange={setDraft}
        onFocus={() => {
          before.current = value;
          lastCommitted.current = null;
          setDraft(formatAlpha(value));
          setIsEditing(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onChange(before.current);
            setDraft(formatAlpha(before.current));
            setIsEditing(false);
            (event.target as HTMLInputElement).blur();
            return;
          }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const step = event.shiftKey ? 0.05 : 0.01;
            nudge(event.key === "ArrowUp" ? step : -step);
            return;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            committed.current = true;
            commit(event.key === "Enter" ? "down" : "right");
          }
        }}
      />
    </div>
  );
}
