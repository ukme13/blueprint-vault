import type { CSSProperties } from "react";
import { Check, Layers, Package } from "lucide-react";
import { layoutCssVariablesForDevice, type LayoutToken } from "@blueprint/ui";
import styles from "./overview.module.css";

/** The frame the board reads its component radii on: the widest, as Preview opens. */
const SPECIMEN_FRAME = "desktop";

const CHIPS = [
  { id: "design-system", label: "Design System", icon: Layers },
  { id: "tokens", label: "Tokens", icon: Package },
  { id: "active", label: "Active", icon: Check },
] as const;

/**
 * Two small controls made of the component radius uses, so the uses can be
 * seen working together rather than one at a time.
 *
 * A field with its button inside it: the field takes Input radius and the
 * button takes Button radius, two corners that have to sit well in one
 * another. And a row of chips on Chip radius, the smallest corner. The
 * project's radius uses are set on the cards, since nothing above the board
 * sets them; a use the project does not have falls back to the scale's own
 * corner, as the Preview's does.
 */
export function OverviewComponentSpecimens({
  layout,
}: {
  layout: readonly LayoutToken[];
}) {
  const radiusUses = layoutCssVariablesForDevice(
    layout.filter((token) => token.kind === "radius"),
    SPECIMEN_FRAME,
  ) as CSSProperties;

  return (
    <>
      <section
        aria-label="Input with action"
        className={styles.card}
        data-specimen="field"
        style={radiusUses}
      >
        <header className={styles.specimenHeader}>
          <h3 className={styles.specimenTitle}>Input</h3>
          <span className={styles.specimenMeta}>Input and Button radius</span>
        </header>
        <span className={styles.field} data-field="">
          <input
            aria-label="Email address"
            className={styles.fieldInput}
            placeholder="you@company.com"
            readOnly
            type="email"
          />
          <button className={styles.fieldAction} type="button">
            Subscribe
          </button>
        </span>
      </section>

      <section
        aria-label="Chips"
        className={styles.card}
        data-specimen="chips"
        style={radiusUses}
      >
        <header className={styles.specimenHeader}>
          <h3 className={styles.specimenTitle}>Chips</h3>
          <span className={styles.specimenMeta}>Chip radius</span>
        </header>
        <ul className={styles.chipRow}>
          {CHIPS.map(({ id, label, icon: Icon }) => (
            <li key={id} className={styles.chip} data-chip={id}>
              <Icon aria-hidden="true" size={14} strokeWidth={2} />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
