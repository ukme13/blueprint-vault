import {
  CONTRAST_STANDARD_LABELS,
  type ContrastStandard,
  type SandboxGlyph,
  type SandboxRow,
} from "@blueprint/ui";
import { ContrastStatusIcon } from "./ContrastStatusIcon";
import styles from "./accessibility-sandbox.module.css";

/**
 * The word beside a row's tick or cross.
 *
 * The tick already says pass, so a graded pass is its grade alone (`AAA`,
 * `AA`), and a pass with no grade under it, WCAG 3's, is the tick alone, named
 * for a screen reader. A fail keeps its word, and so does advisory.
 */
function GradeLabel({ row }: { row: SandboxRow }) {
  if (row.passes && row.grade === "Pass") {
    return <span className={styles.srOnly}>Pass</span>;
  }
  return <>{row.grade}</>;
}

const GLYPH_LABELS: Record<SandboxGlyph, string> = {
  heading: "Heading text",
  body: "Body or small text",
  ui: "UI component or graphic",
};

/**
 * What a row is about, drawn in the pair it measured: a bold A for heading
 * text, a plain a for body text, a square for a fill. The box is the ground
 * and the mark the ink, so the row shows the very colours its figure is for.
 * Real colours, like the figure, however the sandbox is being looked at.
 */
function Glyph({ row }: { row: SandboxRow }) {
  return (
    <span
      aria-label={GLYPH_LABELS[row.glyph]}
      className={styles.glyph}
      data-glyph={row.glyph}
      role="img"
      style={{ backgroundColor: row.background, color: row.foreground }}
    >
      {row.glyph === "heading" ? "A" : null}
      {row.glyph === "body" ? "a" : null}
      {row.glyph === "ui" ? (
        <i aria-hidden="true" style={{ backgroundColor: row.foreground }} />
      ) : null}
    </span>
  );
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
          <li key={row.glyph} data-passes={row.passes ?? undefined}>
            <Glyph row={row} />
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <span className={styles.hudGrade}>
              {row.passes === null ? null : (
                <ContrastStatusIcon passes={row.passes} />
              )}
              <GradeLabel row={row} />
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
