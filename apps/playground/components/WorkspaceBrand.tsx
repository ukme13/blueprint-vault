"use client";

import styles from "./workspace-brand.module.css";

/**
 * `Blueprint / <name>`, with the name editable.
 *
 * One component for every studio. The palette and typography topbars each had
 * their own copy of this markup and of every style behind it, so the scale page
 * either got a third or got nothing — it had nothing, which is why its topbar
 * did not read as the same app and why the workspace could be renamed from two
 * of three places.
 *
 * The name belongs to the workspace rather than to a studio, so every page that
 * shows it can edit it.
 */

interface WorkspaceBrandProps {
  name: string;
  onChange: (name: string) => void;
  /**
   * Called when editing finishes, for studios that persist on commit rather
   * than on every keystroke.
   */
  onCommit?: () => void;
}

export function WorkspaceBrand({
  name,
  onChange,
  onCommit,
}: WorkspaceBrandProps) {
  return (
    <p className={styles.brand}>
      <span aria-hidden="true" className={styles.brandMark}>
        B
      </span>
      <span className={styles.word}>Blueprint</span>
      <span className={styles.breadcrumb}>/</span>
      <input
        aria-label="Project name"
        className={styles.name}
        maxLength={80}
        spellCheck={false}
        value={name}
        onBlur={onCommit}
        onChange={(event) => onChange(event.target.value)}
      />
    </p>
  );
}
