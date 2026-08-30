import { Badge, type BadgeVariant } from "@astryxdesign/core/Badge";
import type { AccessibilityStatus } from "@blueprint/ui";
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
      </span>
      <Badge label={badge} variant={statusVariant(status)} />
    </article>
  );
}
