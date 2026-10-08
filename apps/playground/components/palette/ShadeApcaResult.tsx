import { Fragment } from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { ArrowLeftRight } from "lucide-react";
import { apcaContrast, assessApca, type ShadeItem } from "@blueprint/ui";
import { ContrastStatusIcon } from "./ContrastStatusIcon";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";

interface ShadeApcaResultProps {
  shade: ShadeItem;
  comparisonHex: string;
  /** What the sample shows in words, from the panel that owns the swap. */
  caption: string;
  isSwapped: boolean;
  onSwap: () => void;
}

/**
 * A shade's WCAG 3 contrast against the comparison colour: an `Aa` sample, the
 * Lc, and what it is good for: body text, large text, or a UI component.
 *
 * Unlike a WCAG 2 ratio an Lc depends on which colour is the text, so the swap
 * here changes the number as well as the sample. The sign is the polarity: dark
 * on light is positive, light on dark negative, and the grades go by its size.
 */
export function ShadeApcaResult({
  shade,
  comparisonHex,
  caption,
  isSwapped,
  onSwap,
}: ShadeApcaResultProps) {
  const { seen, view } = usePaletteView();
  const text = isSwapped ? comparisonHex : shade.hex;
  const background = isSwapped ? shade.hex : comparisonHex;
  const assessment = assessApca(text, background);
  const shown = apcaContrast(seen(text), seen(background));
  const isSimulated = view.simulation !== "normal";

  const grades = [
    { label: "Body", threshold: 75, passes: assessment.bodyText },
    { label: "Large", threshold: 60, passes: assessment.largeText },
    { label: "UI", threshold: 45, passes: assessment.uiComponent },
  ];

  return (
    <section
      aria-label="WCAG 3 contrast result"
      className={styles.popoverContrast}
    >
      <header>
        <h3>WCAG 3 contrast</h3>
        <small>{caption}</small>
      </header>
      <p className={styles.popoverContrastScore}>
        <span
          aria-hidden="true"
          data-swapped={isSwapped || undefined}
          style={{ backgroundColor: seen(background), color: seen(text) }}
        >
          Aa
        </span>
        <IconButton
          aria-pressed={isSwapped}
          icon={<ArrowLeftRight aria-hidden className="size-3.5" />}
          label="Swap text and background"
          size="sm"
          variant="ghost"
          onClick={onSwap}
        />
        <strong data-apca-lc={assessment.lc.toFixed(1)}>
          Lc {assessment.lc.toFixed(1)}
        </strong>
      </p>
      {isSimulated && (
        /* A figure and no verdict, as for WCAG 2: the grades are for the real
           colours, and this is what the pair measures once simulated. */
        <small className={styles.contrastSimulated}>
          Lc {shown.toFixed(1)} under {view.simulation}
        </small>
      )}
      <dl className={styles.popoverContrastGrades}>
        {grades.map((grade) => (
          <Fragment key={grade.label}>
            <dt>
              {grade.label}
              <small> Lc {grade.threshold}</small>
            </dt>
            <dd data-pass={grade.passes}>
              <ContrastStatusIcon passes={grade.passes} />
              {grade.passes ? "Pass" : "Fail"}
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}
