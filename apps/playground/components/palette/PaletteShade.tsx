import type { ShadeItem } from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

interface PaletteShadeProps {
  paletteName: string;
  shade: ShadeItem;
  isSelected: boolean;
  onSelect: () => void;
}

export function PaletteShade({
  paletteName,
  shade,
  isSelected,
  onSelect,
}: PaletteShadeProps) {
  return (
    <button
      aria-label={`Select ${paletteName} ${shade.weight}, ${shade.hex}`}
      aria-pressed={isSelected}
      className={styles.shade}
      data-anchor={shade.isAnchor}
      data-selected={isSelected}
      data-tooltip={`${shade.weight} · ${shade.hex}`}
      style={{ backgroundColor: shade.hex }}
      type="button"
      onClick={onSelect}
    >
      {shade.isAnchor && (
        <span aria-label="Source colour" className={styles.anchorIcon}>
          <svg aria-hidden="true" height="12" viewBox="0 0 16 16" width="12">
            <path
              d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2m-6 0h7v6h-7z"
              fill="currentColor"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
