"use client";

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
import { ContrastStatusIcon } from "./ContrastStatusIcon";
import { ShadeApcaResult } from "./ShadeApcaResult";
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
  const { seen, view, contrastStandard, contrastPolarity, togglePolarity } =
    usePaletteView();
  /* One choice for the matrix, the toolbar and every shade's details, so
     turning the pair round anywhere turns it round everywhere. */
  const isSwapped = contrastPolarity === "under";
  /* What the sample shows, said in words, so the swap is not a mystery. */
  const caption = isSwapped
    ? `${capitalise(comparisonLabel)} on Shade`
    : `Shade on ${capitalise(comparisonLabel)}`;
  if (contrastStandard === "wcag3") {
    return (
      <ShadeApcaResult
        caption={caption}
        comparisonHex={comparisonHex}
        isSwapped={isSwapped}
        shade={shade}
        onSwap={togglePolarity}
      />
    );
  }
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
          onClick={togglePolarity}
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
