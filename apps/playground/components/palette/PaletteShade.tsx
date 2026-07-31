import { Popover } from "@astryxdesign/core/Popover";
import type { ShadeItem } from "@blueprint/ui";
import { ShadeDetailPopover } from "./ShadeDetailPopover";
import styles from "./palette-workspace.module.css";

interface PaletteShadeProps {
  paletteName: string;
  shade: ShadeItem;
  isSelected: boolean;
  onSelect: (isSelected: boolean) => void;
}

export function PaletteShade({
  paletteName,
  shade,
  isSelected,
  onSelect,
}: PaletteShadeProps) {
  return (
    <Popover
      alignment="center"
      hasCloseButton={false}
      isOpen={isSelected}
      label={`${paletteName} ${shade.weight} shade details`}
      placement="below"
      width={300}
      content={
        <ShadeDetailPopover
          paletteName={paletteName}
          shade={shade}
          onClose={() => onSelect(false)}
        />
      }
      onOpenChange={onSelect}
    >
      <button
        aria-label={`Select ${paletteName} ${shade.weight}, ${shade.hex}`}
        aria-pressed={isSelected}
        className={styles.shade}
        data-anchor={shade.isAnchor}
        data-selected={isSelected}
        style={{ backgroundColor: shade.hex }}
        title={`${shade.weight} · ${shade.hex}`}
        type="button"
      >
        {shade.isAnchor && (
          <span
            aria-label="Source colour"
            className={styles.anchorIcon}
            data-light-shade={shade.weight <= 400}
          >
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
          </span>
        )}
      </button>
    </Popover>
  );
}
