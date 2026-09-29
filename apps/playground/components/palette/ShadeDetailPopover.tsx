"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Switch } from "@astryxdesign/core/Switch";
import { useToast } from "@astryxdesign/core/Toast";
import {
  COLOUR_FORMAT_LABELS,
  Button,
  formatColour,
  type ShadeItem,
} from "@blueprint/ui";
import { useColourFormat } from "./ColourFormatContext";
import { ColourFormatSelector } from "./ColourFormatSelector";
import { ColourPicker } from "./ColourPicker";
import { ShadeContrastResult } from "./ShadeContrastResult";
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
  /**
   * `sheet` is the phone's bottom sheet: no close button of its own, and
   * the anchor control is a switch. Editing is the same as in the popover —
   * the button beside the value opens the picker.
   */
  layout?: "popover" | "sheet";
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
  layout = "popover",
}: ShadeDetailPopoverProps) {
  const isSheet = layout === "sheet";
  const { seen } = usePaletteView();
  const { colourFormat } = useColourFormat();
  const { copyText } = useCopyFeedback(1200);
  const toast = useToast();
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
    <section
      className={styles.shadePopoverContent}
      data-layout={isSheet ? "sheet" : undefined}
    >
      <header>
        <p>
          {/* The shade as it is being looked at. The hex below and the picker
              stay on the real colour: those are the value, not the view of it.
              The contrast demonstration is a view, so it simulates. */}
          <i style={{ backgroundColor: seen(shade.hex) }} />
          <strong>
            {paletteName} · {shade.weight}
          </strong>
        </p>
        {/* A phone's sheet closes from its backdrop, a swipe down or Escape, so it carries no close button of its own. */}
        {!isSheet && (
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
        )}
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

      {/* The source shade is the track's seed and is always the anchor, so
          it has nothing to switch. */}
      {isSheet && shade.anchorType !== "source" && (
        <div className={styles.shadeSheetAnchor}>
          <Switch
            description="Hold this colour and bend the scale around it."
            label="Anchor"
            value={shade.anchorType === "custom"}
            onChange={(isAnchor) =>
              changeEditMode(isAnchor ? "anchor" : "manual")
            }
          />
        </div>
      )}

      {(shade.isOverridden || shade.anchorType === "custom") && (
        <section
          aria-label="Shade edit controls"
          className={styles.popoverAnchorEditor}
        >
          {!isSheet && (
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
          )}
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

      <ShadeContrastResult
        comparisonHex={comparisonHex}
        comparisonLabel={comparisonLabel}
        shade={shade}
      />
    </section>
  );
}
