import { Popover } from "@astryxdesign/core/Popover";
import {
  contrastRatio,
  recommendTextColour,
  type ShadeItem,
} from "@blueprint/ui";
import { ShadeDetailPopover } from "./ShadeDetailPopover";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";

interface PaletteShadeProps {
  paletteName: string;
  shade: ShadeItem;
  isSelected: boolean;
  contrastReferenceHex?: string;
  wcagComparisonHex: string;
  wcagComparisonLabel: "white" | "black" | "custom";
  onSelect: (isSelected: boolean) => void;
  onAnchorChange: (hex: string | null) => void;
  onManualChange: (hex: string | null) => void;
  onSourceChange: (hex: string) => void;
}

export function PaletteShade({
  paletteName,
  shade,
  isSelected,
  contrastReferenceHex,
  wcagComparisonHex,
  wcagComparisonLabel,
  onSelect,
  onAnchorChange,
  onManualChange,
  onSourceChange,
}: PaletteShadeProps) {
  const { seen } = usePaletteView();

  const ratio = contrastReferenceHex
    ? contrastRatio(shade.hex, contrastReferenceHex)
    : null;
  const foreground = recommendTextColour(shade.hex).colour;
  const ratioLabel = ratio?.toFixed(1);

  return (
    <Popover
      alignment="center"
      hasCloseButton={false}
      isOpen={isSelected}
      label={`${paletteName} ${shade.weight} shade details`}
      placement="below"
      width="max-content"
      content={
        <ShadeDetailPopover
          paletteName={paletteName}
          shade={shade}
          comparisonHex={wcagComparisonHex}
          comparisonLabel={wcagComparisonLabel}
          onAnchorChange={onAnchorChange}
          onManualChange={onManualChange}
          onSourceChange={onSourceChange}
          onClose={() => onSelect(false)}
        />
      }
      onOpenChange={onSelect}
    >
      <button
        aria-label={`Select ${paletteName} ${shade.weight}, ${shade.hex}${ratioLabel ? `, contrast ${ratioLabel} to 1` : ""}`}
        aria-pressed={isSelected}
        className={styles.shade}
        data-anchor={shade.isAnchor}
        data-contrast-ratio={ratioLabel}
        data-has-contrast={ratio !== null}
        data-selected={isSelected}
        /* Simulated for the eye only. The label, the title and the contrast
           ratio above all keep the real hex, because that is the token this
           swatch stands for and the value somebody copies out of it. */
        style={{ backgroundColor: seen(shade.hex), color: seen(foreground) }}
        title={`${shade.weight} · ${shade.hex}`}
        type="button"
      >
        <span className={styles.shadeContent}>
          {ratioLabel && (
            <span aria-hidden="true" className={styles.shadeContrastRatio}>
              {ratioLabel}
            </span>
          )}
          {shade.isAnchor && (
            <span
              aria-label={
                shade.anchorType === "source"
                  ? "Source colour"
                  : "Colour anchor"
              }
              className={styles.anchorIcon}
              data-anchor-type={shade.anchorType}
              data-light-shade={shade.weight <= 400}
            >
              {shade.anchorType === "source" ? (
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="20"
                  viewBox="0 0 16 16"
                  width="20"
                >
                  <path
                    d="M6.28125 5.96875V7H9.71875V5.96875C9.71875 5.02344 8.94531 4.25 8 4.25C7.0332 4.25 6.28125 5.02344 6.28125 5.96875ZM4.90625 7V5.96875C4.90625 4.27148 6.28125 2.875 8 2.875C9.69727 2.875 11.0938 4.27148 11.0938 5.96875V7H11.4375C12.1895 7 12.8125 7.62305 12.8125 8.375V12.5C12.8125 13.2734 12.1895 13.875 11.4375 13.875H4.5625C3.78906 13.875 3.1875 13.2734 3.1875 12.5V8.375C3.1875 7.62305 3.78906 7 4.5625 7H4.90625Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="20"
                  viewBox="0 0 16 16"
                  width="20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.5625 3.5625C4.5625 3.19727 4.86328 2.875 5.25 2.875H10.75C11.1152 2.875 11.4375 3.19727 11.4375 3.5625C11.4375 3.94922 11.1152 4.25 10.75 4.25H10.1055L10.3418 7.45117C11.1367 7.88086 11.7598 8.58984 12.0605 9.4707L12.082 9.53516C12.1465 9.75 12.125 9.98633 11.9961 10.1582C11.8672 10.3301 11.6523 10.4375 11.4375 10.4375H4.5625C4.32617 10.4375 4.13281 10.3516 4.00391 10.1582C3.85352 9.98633 3.83203 9.75 3.89648 9.53516L3.91797 9.4707C4.21875 8.58984 4.8418 7.88086 5.63672 7.45117L5.87305 4.25H5.25C4.86328 4.25 4.5625 3.94922 4.5625 3.5625ZM7.3125 11.125H8.6875V13.1875C8.6875 13.5742 8.36523 13.875 8 13.875C7.61328 13.875 7.3125 13.5742 7.3125 13.1875V11.125Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </span>
          )}
          {!shade.isAnchor && shade.isOverridden && (
            <span
              aria-label="Manual colour"
              className={styles.manualIcon}
              data-light-shade={shade.weight <= 400}
            >
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
            </span>
          )}
        </span>
      </button>
    </Popover>
  );
}
