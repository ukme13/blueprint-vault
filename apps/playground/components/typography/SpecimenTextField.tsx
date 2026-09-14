"use client";

import type { CSSProperties } from "react";
import { DEFAULT_SPECIMEN_TEXT } from "@blueprint/ui";
import styles from "./typography-workspace.module.css";

export interface SpecimenTextFieldProps {
  value: string;
  style?: CSSProperties;
  onChange: (value: string) => void;
}

/**
 * In-place specimen copy. Type in any field and every field follows.
 *
 * An input's box is the line box of its primary family, and it clips — so a
 * fallback covering another script sits taller than the box and loses the
 * marks above and below. The hidden mirror is sized by every font that ends
 * up drawing, which is the height the row actually needs. The input fills it.
 */
export function SpecimenTextField({
  value,
  style,
  onChange,
}: SpecimenTextFieldProps) {
  return (
    <span className={styles.stepSampleBox} style={style}>
      <span aria-hidden="true" className={styles.stepSampleMirror}>
        {value || DEFAULT_SPECIMEN_TEXT}
      </span>
      <input
        aria-label="Specimen text"
        className={styles.stepSample}
        placeholder={DEFAULT_SPECIMEN_TEXT}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  );
}
