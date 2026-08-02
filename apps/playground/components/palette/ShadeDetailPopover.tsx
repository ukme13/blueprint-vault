"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import {
  assessNonTextContrast,
  assessTextContrast,
  type ShadeItem,
} from "@blueprint/ui";
import styles from "./palette-workspace.module.css";
import { useCopyFeedback } from "./useCopyFeedback";

interface ShadeDetailPopoverProps {
  paletteName: string;
  shade: ShadeItem;
  comparisonHex: string;
  comparisonLabel: "white" | "black" | "custom";
  onClose: () => void;
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

export function ShadeDetailPopover({
  paletteName,
  shade,
  comparisonHex,
  comparisonLabel,
  onClose,
}: ShadeDetailPopoverProps) {
  const { copyText, status } = useCopyFeedback(1200);
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
  const oklchValue = `oklch(${(shade.L * 100).toFixed(1)}% ${shade.C.toFixed(3)} ${shade.H.toFixed(1)})`;
  const copyLabel =
    status === "copied"
      ? "Copied"
      : status === "error"
        ? "Copy failed"
        : "Copy OKLCH";

  return (
    <section className={styles.shadePopoverContent}>
      <header>
        <p>
          <i style={{ backgroundColor: shade.hex }} />
          <strong>
            {paletteName} · {shade.weight}
          </strong>
        </p>
        <IconButton
          icon={
            <svg
              aria-hidden="true"
              fill="none"
              height="16"
              viewBox="0 0 16 16"
              width="16"
            >
              <path
                d="m4.5 4.5 7 7m0-7-7 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
            </svg>
          }
          label="Close shade details"
          size="sm"
          variant="ghost"
          onClick={onClose}
        />
      </header>

      <p className={styles.popoverValue}>
        <span>OKLCH</span>
        <button
          aria-label="Copy OKLCH value"
          data-copy-status={status}
          title={copyLabel}
          type="button"
          onClick={() => copyText(oklchValue)}
        >
          <code>
            {status === "copied"
              ? "Copied"
              : status === "error"
                ? "Copy failed"
                : oklchValue}
          </code>
        </button>
        <span
          aria-live="polite"
          className={styles.visuallyHidden}
          role="status"
        >
          {status === "copied"
            ? `${oklchValue} copied to clipboard.`
            : status === "error"
              ? "Could not copy the OKLCH value."
              : ""}
        </span>
      </p>

      <section
        aria-label="WCAG 2 contrast result"
        className={styles.popoverContrast}
      >
        <header>
          <h3>WCAG 2 contrast</h3>
          <small>
            Against {comparisonLabel} {comparisonHex.toUpperCase()}
          </small>
        </header>
        <p className={styles.popoverContrastScore}>
          <span
            aria-hidden="true"
            style={{ backgroundColor: comparisonHex, color: shade.hex }}
          >
            Aa
          </span>
          <strong>{textContrast.ratio.toFixed(2)}:1</strong>
        </p>
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

    </section>
  );
}
