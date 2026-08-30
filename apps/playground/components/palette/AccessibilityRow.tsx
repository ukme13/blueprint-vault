import { Badge, type BadgeVariant } from "@astryxdesign/core/Badge";
import {
  colourVisionLabel,
  type AccessibilityStatus,
  type ColourVisionDeficiency,
  type SimulatedContrast,
} from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

/**
 * One line of the accessibility report: a swatch, what was measured, and the
 * verdict. Shared by all four sections so they cannot drift apart.
 */
interface AccessibilityRowProps {
  background: string;
  badge: string;
  detail: string;
  foreground: string;
  label: string;
  ratioLabel: string;
  status: AccessibilityStatus;
  summary: string;
  swatchLabel?: string;
  swatchType?: "text" | "border" | "focus";
  /** The ratio under the mode being previewed, when one is. */
  simulated?: SimulatedContrast | null;
  /** Deficiencies that take this pair below its threshold. */
  weakensUnder?: ColourVisionDeficiency[];
}

function listNames(deficiencies: ColourVisionDeficiency[]): string {
  const names = deficiencies.map(colourVisionLabel);
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)!}`;
}

function statusVariant(status: AccessibilityStatus): BadgeVariant {
  if (status === "pass") return "success";
  if (status === "partial") return "warning";
  return "error";
}

export function AccessibilityRow({
  background,
  badge,
  detail,
  foreground,
  label,
  ratioLabel,
  status,
  summary,
  swatchLabel = "Aa",
  swatchType = "text",
  simulated = null,
  weakensUnder = [],
}: AccessibilityRowProps) {
  return (
    <article>
      <span
        aria-hidden="true"
        className={styles.contrastSwatch}
        style={{ backgroundColor: background, color: foreground }}
      >
        {swatchType === "border" ? (
          <i className={styles.controlContrastExample} />
        ) : swatchType === "focus" ? (
          <i className={styles.focusContrastExample} />
        ) : (
          swatchLabel
        )}
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
        <small className={styles.contrastResult}>
          {ratioLabel} — {summary}
        </small>
        {simulated && (
          /* A ratio and no verdict. WCAG defines AA on the real colours, so
             this number is what the pair measures once simulated and never a
             pass or a fail. */
          <small
            className={styles.contrastSimulated}
            data-weakens={simulated.weakens}
          >
            {simulated.ratio.toFixed(2)}:1 under{" "}
            {colourVisionLabel(simulated.deficiency).toLowerCase()}
            {simulated.severity < 1 &&
              ` at ${Math.round(simulated.severity * 100)}%`}
            {simulated.weakens && " — below the threshold it clears normally"}
          </small>
        )}
        {!simulated && weakensUnder.length > 0 && (
          <small className={styles.contrastSimulated} data-weakens="true">
            Drops below the threshold under {listNames(weakensUnder)}
          </small>
        )}
      </span>
      <Badge label={badge} variant={statusVariant(status)} />
    </article>
  );
}
