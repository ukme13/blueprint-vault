"use client";

import { useState } from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import {
  COLOUR_FORMAT_LABELS,
  cleanShadeLabel,
  formatColour,
  type ShadeItem,
} from "@blueprint/ui";
import { useColourFormat } from "./ColourFormatContext";
import { ColourFormatSelector } from "./ColourFormatSelector";
import { ColourPicker } from "./ColourPicker";
import { ShadeContrastResult } from "./ShadeContrastResult";
import { ShadeEditModeControls } from "./ShadeEditModeControls";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";
import { useCopyFeedback } from "../useCopyFeedback";

interface ShadeDetailPopoverProps {
  paletteName: string;
  shade: ShadeItem;
  /** The track's seed: what the picker edits while it edits the source. */
  sourceHex: string;
  comparisonHex: string;
  comparisonLabel: "white" | "black" | "custom";
  onAnchorChange: (hex: string | null) => void;
  onManualChange: (hex: string | null) => void;
  onSourceChange: (hex: string) => void;
  /** This shade's nickname, as it stands; empty for none. */
  nickname: string;
  onNicknameChange: (nickname: string) => void;
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
  sourceHex,
  shade,
  comparisonHex,
  comparisonLabel,
  onAnchorChange,
  onManualChange,
  onSourceChange,
  nickname,
  onNicknameChange,
  onClose,
  layout = "popover",
}: ShadeDetailPopoverProps) {
  const isSheet = layout === "sheet";
  /* Opened on the source shade, it edits the source until it closes. A new
     lightness moves the source to another weight, and this shade stops
     being it; without this, the next pick would land as a manual override
     here, with Manual, Anchor and Reset beside it. The callers remount the
     popover each time it opens, so this is the shade as it was then. */
  const [openedOnSource] = useState(shade.anchorType === "source");
  const isSource = openedOnSource || shade.anchorType === "source";
  const { seen } = usePaletteView();
  const { colourFormat } = useColourFormat();
  const { copyText } = useCopyFeedback(1200);
  const toast = useToast();
  /* What is in the field is kept here, as typed: the nickname that comes back
     from the track is cleaned and trimmed, and a field fed that could not take
     a space, so a second word would be impossible. The popover is new each time
     it opens, so this starts from what was stored. */
  const [nicknameText, setNicknameText] = useState(nickname);
  /* What an export says with no nickname: the key shades say what they are. */
  const nicknamePlaceholder =
    shade.anchorType === "source"
      ? "main"
      : shade.anchorType === "custom"
        ? "submain"
        : "";
  const colourValue = formatColour(shade.hex, colourFormat);
  const formatLabel = COLOUR_FORMAT_LABELS[colourFormat];
  const copyLabel = `Copy ${formatLabel}`;
  const editLabel = isSource
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
    /* Still the source after it has moved: see isSource above. */
    if (isSource) {
      onSourceChange(hex);
    } else if (shade.anchorType === "custom") {
      onAnchorChange(hex);
    } else {
      onManualChange(hex);
    }
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
            /* The source's own colour while it is the source being edited:
               once it has moved, this weight's colour is somebody else's,
               and the picker would commit that on Enter. */
            value={isSource ? sourceHex : shade.hex}
            onChange={editColour}
          />
        </div>
      </div>

      <div className={styles.popoverNickname}>
        <TextInput
          label="Nickname"
          labelTooltip="Said beside this token in an export."
          placeholder={nicknamePlaceholder}
          size="sm"
          value={nicknameText}
          width="100%"
          onChange={(value) => {
            const typed = cleanShadeLabel(value);
            setNicknameText(typed);
            onNicknameChange(typed);
          }}
        />
      </div>

      {!isSource && (
        <ShadeEditModeControls
          isSheet={isSheet}
          shade={shade}
          onAnchorChange={onAnchorChange}
          onManualChange={onManualChange}
        />
      )}

      <ShadeContrastResult
        comparisonHex={comparisonHex}
        comparisonLabel={comparisonLabel}
        shade={shade}
      />
    </section>
  );
}
