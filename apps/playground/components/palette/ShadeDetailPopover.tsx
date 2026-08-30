"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { useToast } from "@astryxdesign/core/Toast";
import {
  assessNonTextContrast,
  assessTextContrast,
  COLOUR_FORMAT_LABELS,
  Button,
  formatColour,
  type ShadeItem,
} from "@blueprint/ui";
import { useColourFormat } from "./ColourFormatContext";
import { ColourFormatSelector } from "./ColourFormatSelector";
import { ColourPicker } from "./ColourPicker";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";
import { useCopyFeedback } from "../useCopyFeedback";

interface ShadeDetailPopoverProps {
  paletteName: string;
  shade: ShadeItem;
  comparisonHex: string;
  comparisonLabel: "white" | "black" | "custom";
  onAnchorChange: (hex: string | null) => void;
  onManualChange: (hex: string | null) => void;
  onSourceChange: (hex: string) => void;
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
  onAnchorChange,
  onManualChange,
  onSourceChange,
  onClose,
}: ShadeDetailPopoverProps) {
  const { seen } = usePaletteView();
  const { colourFormat } = useColourFormat();
  const { copyText } = useCopyFeedback(1200);
  const toast = useToast();
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
  const colourValue = formatColour(shade.hex, colourFormat);
  const formatLabel = COLOUR_FORMAT_LABELS[colourFormat];
  const copyLabel = `Copy ${formatLabel}`;
  const editLabel =
    shade.anchorType === "source"
      ? `${paletteName} ${shade.weight} source shade colour`
      : shade.anchorType === "custom"
        ? `${paletteName} ${shade.weight} anchor colour`
        : `${paletteName} ${shade.weight} manual colour`;

  const copyColour = async () => {
    const didCopy = await copyText(colourValue);
    toast({
      autoHideDuration: 1800,
      body: didCopy ? (
        <span className={styles.copyToastMessage}>
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
            <path
              d="m3.5 8.2 2.8 2.8 6.2-6.2"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          Color copied
        </span>
      ) : (
        "Could not copy color"
      ),
      type: didCopy ? "info" : "error",
      uniqueID: "shade-color-copy",
    });
  };

  const editColour = (hex: string) => {
    if (shade.anchorType === "source") {
      onSourceChange(hex);
    } else if (shade.anchorType === "custom") {
      onAnchorChange(hex);
    } else {
      onManualChange(hex);
    }
  };

  const changeEditMode = (mode: string) => {
    const becomesAnchor = mode === "anchor";

    if (becomesAnchor) {
      onAnchorChange(shade.hex);
    } else {
      onManualChange(shade.hex);
    }

    toast({
      autoHideDuration: 1800,
      body: becomesAnchor ? "Changed to anchor" : "Changed to manual colour",
      type: "info",
      uniqueID: "shade-anchor-change",
    });
  };

  const resetColour = () => {
    if (shade.anchorType === "custom") {
      onAnchorChange(null);
    } else {
      onManualChange(null);
    }
    toast({
      autoHideDuration: 1800,
      body:
        shade.anchorType === "custom"
          ? "Anchor removed"
          : "Manual colour reset",
      type: "info",
      uniqueID: "shade-anchor-change",
    });
  };

  return (
    <section className={styles.shadePopoverContent}>
      <header>
        <p>
          {/* The shade as it is being looked at. The hex below, the picker
              and the contrast demonstration all stay on the real colour: those
              are the value, not the view of it. */}
          <i style={{ backgroundColor: seen(shade.hex) }} />
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

      <div className={styles.popoverValue}>
        <ColourFormatSelector label="Shade colour format" width={120} />
        <div className={styles.popoverValueActions}>
          <button
            aria-label={`Copy ${formatLabel} value`}
            className={styles.popoverCopyButton}
            title={copyLabel}
            type="button"
            onClick={copyColour}
          >
            <code>{colourValue}</code>
          </button>
          <ColourPicker
            label={editLabel}
            trigger={
              <svg
                aria-hidden="true"
                fill="none"
                height="20"
                viewBox="0 0 16 16"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.5625 9.75C4.17578 9.75 3.875 10.0723 3.875 10.4375C3.875 10.8242 4.17578 11.125 4.5625 11.125C4.92773 11.125 5.25 10.8242 5.25 10.4375C5.25 10.0723 4.92773 9.75 4.5625 9.75ZM6.49609 9.75H12.8125C13.1777 9.75 13.5 10.0723 13.5 10.4375C13.5 10.8242 13.1777 11.125 12.8125 11.125H6.49609C6.2168 11.9414 5.44336 12.5 4.5625 12.5C3.42383 12.5 2.5 11.5762 2.5 10.4375C2.5 9.29883 3.42383 8.375 4.5625 8.375C5.44336 8.375 6.2168 8.95508 6.49609 9.75ZM10.75 6.3125C10.75 6.69922 11.0508 7 11.4375 7C11.8027 7 12.125 6.69922 12.125 6.3125C12.125 5.94727 11.8027 5.625 11.4375 5.625C11.0508 5.625 10.75 5.94727 10.75 6.3125ZM9.48242 5.625C9.76172 4.83008 10.5352 4.25 11.4375 4.25C12.5762 4.25 13.5 5.17383 13.5 6.3125C13.5 7.45117 12.5762 8.375 11.4375 8.375C10.5352 8.375 9.76172 7.81641 9.48242 7H3.1875C2.80078 7 2.5 6.69922 2.5 6.3125C2.5 5.94727 2.80078 5.625 3.1875 5.625H9.48242Z"
                  fill="currentColor"
                />
              </svg>
            }
            triggerLabel={`Edit ${paletteName} ${shade.weight} colour`}
            value={shade.hex}
            onChange={editColour}
          />
        </div>
      </div>

      {(shade.isOverridden || shade.anchorType === "custom") && (
        <section
          aria-label="Shade edit controls"
          className={styles.popoverAnchorEditor}
        >
          <span className={styles.shadeEditModeControl}>
            <SegmentedControl
              label="Shade colour mode"
              layout="fill"
              size="sm"
              value={shade.anchorType === "custom" ? "anchor" : "manual"}
              onChange={changeEditMode}
            >
              <SegmentedControlItem label="Manual" value="manual" />
              <SegmentedControlItem label="Anchor" value="anchor" />
            </SegmentedControl>
          </span>
          <Button
            scheme="neutral"
            size="xs"
            variant="text"
            onClick={resetColour}
          >
            Reset
          </Button>
        </section>
      )}

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
