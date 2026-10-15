"use client";

import { useState, type ReactNode } from "react";
import styles from "./inspect-panel.module.css";

/**
 * The parts every section of the inspect panel is made of: a heading, a
 * labelled field, a 24px icon button, and a number.
 */

export function InspectSection({
  title,
  action,
  isEmpty = false,
  onAdd,
  children,
}: {
  title: string;
  /** What sits at the heading's end: usually a Plus that adds. */
  action?: ReactNode;
  /** Nothing set yet: only the heading, with its Plus. */
  isEmpty?: boolean;
  /**
   * What adding does. While the section is empty the whole heading does it, so
   * the target is the row and not only the Plus; the Plus stays the one a
   * keyboard reaches.
   */
  onAdd?: () => void;
  children?: ReactNode;
}) {
  const canAdd = isEmpty && onAdd !== undefined;
  return (
    <section
      aria-label={title}
      className={styles.section}
      data-empty={isEmpty || undefined}
    >
      <header
        className={styles.sectionHead}
        data-addable={canAdd || undefined}
        onClick={
          canAdd
            ? (event) => {
                /* The Plus has its own press. */
                if ((event.target as HTMLElement).closest("button")) return;
                onAdd();
              }
            : undefined
        }
      >
        <h3>{title}</h3>
        {action}
      </header>
      {isEmpty ? null : children}
    </section>
  );
}

export function InspectField({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      {label ? <span>{label}</span> : null}
      {children}
    </div>
  );
}

/**
 * A control that shows a value and has nothing to choose: the edge of a divider,
 * the colour of the page. Drawn as the other controls are, so it sits in a row
 * with them, and named so a reader hears what it is.
 */
export function InspectStatic({
  label,
  icon,
  children,
}: {
  label: string;
  /** A mark ahead of the value: a swatch. */
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span aria-label={label} className={styles.control} role="group">
      {icon ? <span className={styles.lead}>{icon}</span> : null}
      <span
        className={`${styles.value} ${icon ? "" : styles.staticValue}`.trim()}
      >
        {children}
      </span>
    </span>
  );
}

export function InspectIconButton({
  label,
  icon,
  isPressed,
  isDisabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  isPressed?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={isPressed}
      className={styles.iconButton}
      disabled={isDisabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

/**
 * A whole number in a 24px control: opacity, as a percentage.
 *
 * Kept as text while it is typed and read when it is left or Enter is
 * pressed, so a half-typed "5" on the way to "50" is not applied; the arrow
 * keys step it. Out of range is brought into range, not refused.
 */
export function InspectNumber({
  label,
  icon,
  value,
  min,
  max,
  suffix,
  onCommit,
}: {
  label: string;
  icon?: ReactNode;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (next: number) =>
    Math.min(max, Math.max(min, Math.round(next)));

  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft.replace(/[^\d.-]/g, ""));
    setDraft(null);
    if (draft.trim() === "" || !Number.isFinite(parsed)) return;
    if (clamp(parsed) !== value) onCommit(clamp(parsed));
  };

  return (
    <label className={styles.control}>
      {icon ? <span className={styles.lead}>{icon}</span> : null}
      <input
        aria-label={label}
        className={styles.input}
        inputMode="numeric"
        value={draft ?? `${value}${suffix ?? ""}`}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const step =
              (event.shiftKey ? 10 : 1) * (event.key === "ArrowUp" ? 1 : -1);
            setDraft(null);
            onCommit(clamp(value + step));
          } else if (event.key === "Escape") {
            setDraft(null);
          }
        }}
      />
    </label>
  );
}
