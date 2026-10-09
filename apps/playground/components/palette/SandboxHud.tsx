import {
  CONTRAST_STANDARD_LABELS,
  type ContrastStandard,
  type SandboxRow,
} from "@blueprint/ui";
import { ContrastStatusIcon } from "./ContrastStatusIcon";
import styles from "./accessibility-sandbox.module.css";

/** `AA Pass` for a graded pass, and the plain word otherwise. */
function gradeLabel(row: SandboxRow): string {
  return row.passes && row.grade !== "Pass" ? `${row.grade} Pass` : row.grade;
}

interface SandboxHudProps {
  standard: ContrastStandard;
  targetLabel: string;
  rows: SandboxRow[];
}

/**
 * The live reading for the selected layer, held in a strip under the sandbox.
 *
 * Measured on the real colours, however the sandbox is being looked at: a
 * simulated pair would report a pass the design does not have. A figure with
 * no requirement behind it, a canvas against its page, is given as advisory
 * and carries no tick or cross.
 */
export function SandboxHud({ standard, targetLabel, rows }: SandboxHudProps) {
  return (
    <aside
      aria-label={`${CONTRAST_STANDARD_LABELS[standard]} contrast for ${targetLabel}`}
      className={styles.hud}
      data-standard={standard}
    >
      <h3>
        {CONTRAST_STANDARD_LABELS[standard]} contrast <span>{targetLabel}</span>
      </h3>
      <ul>
        {rows.map((row) => (
          <li key={row.label} data-passes={row.passes ?? undefined}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <span className={styles.hudGrade}>
              {row.passes === null ? null : (
                <ContrastStatusIcon passes={row.passes} />
              )}
              {gradeLabel(row)}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
