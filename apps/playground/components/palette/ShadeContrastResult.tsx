"use client";

import { useState } from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { ArrowLeftRight } from "lucide-react";
import {
  assessNonTextContrast,
  assessTextContrast,
  colourVisionLabel,
  simulatedContrast,
  WCAG_CONTRAST,
  type ShadeItem,
} from "@blueprint/ui";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";

interface ShadeContrastResultProps {
  shade: ShadeItem;
  comparisonHex: string;
  comparisonLabel: "white" | "black" | "custom";
}

function contrastGrade(aaa: boolean, aa: boolean): "AAA" | "AA" | "Fail" {
  if (aaa) return "AAA";
  if (aa) return "AA";
  return "Fail";
}

function ContrastStatusIcon({ passes }: { passes: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={
          passes
            ? "M8 13.875C6.02344 13.875 4.21875 12.8438 3.23047 11.125C2.24219 9.42773 2.24219 7.34375 3.23047 5.625C4.21875 3.92773 6.02344 2.875 8 2.875C9.95508 2.875 11.7598 3.92773 12.748 5.625C13.7363 7.34375 13.7363 9.42773 12.748 11.125C11.7598 12.8438 9.95508 13.875 8 13.875ZM10.4277 7.36523H10.4062C10.6211 7.17188 10.6211 6.84961 10.4062 6.63477C10.2129 6.44141 9.89062 6.44141 9.69727 6.63477L7.3125 9.04102L6.30273 8.03125C6.08789 7.81641 5.76562 7.81641 5.57227 8.03125C5.35742 8.22461 5.35742 8.54688 5.57227 8.74023L6.94727 10.1152C7.14062 10.3301 7.46289 10.3301 7.67773 10.1152L10.4277 7.36523Z"
            : "M11.2227 6.11914L8.9668 8.375L11.2227 10.6523C11.502 10.9102 11.502 11.3613 11.2227 11.6191C10.9648 11.8984 10.5137 11.8984 10.2559 11.6191L8 9.36328L5.72266 11.6191C5.46484 11.8984 5.01367 11.8984 4.75586 11.6191C4.47656 11.3613 4.47656 10.9102 4.75586 10.6523L7.01172 8.375L4.75586 6.11914C4.47656 5.86133 4.47656 5.41016 4.75586 5.15234C5.01367 4.87305 5.46484 4.87305 5.72266 5.15234L8 7.4082L10.2559 5.15234C10.5137 4.87305 10.9648 4.87305 11.2227 5.15234C11.502 5.41016 11.502 5.86133 11.2227 6.11914Z"
        }
        fill="currentColor"
      />
    </svg>
  );
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * A shade's WCAG 2 contrast against the comparison colour: an `Aa` sample,
 * the ratio, what it measures under a simulated colour vision, and the
 * grades for large text, small text and graphics.
 *
 * The sample shows the shade as text on the comparison colour, and the swap
 * button turns it round: the comparison colour as text on the shade, the
 * way a white label sits on a coloured button. The ratio is the same both
 * ways, so only the sample moves.
 */
export function ShadeContrastResult({
  shade,
  comparisonHex,
  comparisonLabel,
}: ShadeContrastResultProps) {
  const { seen, view } = usePaletteView();
  const [isSwapped, setIsSwapped] = useState(false);
  /* What the sample shows, said in words, so the swap is not a mystery. */
  const caption = isSwapped
    ? `${capitalise(comparisonLabel)} on Shade`
    : `Shade on ${capitalise(comparisonLabel)}`;
  const textContrast = assessTextContrast(shade.hex, comparisonHex);
  const graphicContrast = assessNonTextContrast(shade.hex, comparisonHex);
  const largeTextGrade = contrastGrade(
    textContrast.largeText.aaa,
    textContrast.largeText.aa,
  );
  const smallTextGrade = contrastGrade(
    textContrast.normalText.aaa,
    textContrast.normalText.aa,
  );
  /* Normal-text AA, the same threshold the preview checks use, so "weakens"
     means the same thing in both places. */
  const simulated = simulatedContrast(
    shade.hex,
    comparisonHex,
    view,
    textContrast.ratio,
    WCAG_CONTRAST.normalTextAA,
  );

  return (
    <section
      aria-label="WCAG 2 contrast result"
      className={styles.popoverContrast}
    >
      <header>
        <h3>WCAG 2 contrast</h3>
        <small>{caption}</small>
      </header>
      <p className={styles.popoverContrastScore}>
        <span
          aria-hidden="true"
          data-swapped={isSwapped || undefined}
          style={{
            backgroundColor: seen(isSwapped ? shade.hex : comparisonHex),
            color: seen(isSwapped ? comparisonHex : shade.hex),
          }}
        >
          Aa
        </span>
        <IconButton
          aria-pressed={isSwapped}
          icon={<ArrowLeftRight aria-hidden className="size-3.5" />}
          label="Swap text and background"
          size="sm"
          variant="ghost"
          onClick={() => setIsSwapped((current) => !current)}
        />
        <strong>{textContrast.ratio.toFixed(2)}:1</strong>
      </p>
      {simulated && (
        /* A ratio and no verdict, as everywhere else: WCAG defines AA on the
           real colours, so this is what the pair measures once simulated and
           never a pass or a fail. */
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
      <dl className={styles.popoverContrastGrades}>
        <dt>Large text</dt>
        <dd data-pass={largeTextGrade !== "Fail"}>
          <ContrastStatusIcon passes={largeTextGrade !== "Fail"} />
          {largeTextGrade}
        </dd>
        <dt>Small text</dt>
        <dd data-pass={smallTextGrade !== "Fail"}>
          <ContrastStatusIcon passes={smallTextGrade !== "Fail"} />
          {smallTextGrade}
        </dd>
        <dt>Graphics</dt>
        <dd data-pass={graphicContrast.passes}>
          <ContrastStatusIcon passes={graphicContrast.passes} />
          {graphicContrast.passes ? "AA" : "Fail"}
        </dd>
      </dl>
    </section>
  );
}
