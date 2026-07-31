import type { ShadeItem } from "@blueprint/ui";

interface PaletteShadeProps {
  shade: ShadeItem;
  isSelected: boolean;
  onSelect: () => void;
}

export function PaletteShade({
  shade,
  isSelected,
  onSelect,
}: PaletteShadeProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`p-1.5 bg-neutral-800 border rounded-xl cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
        shade.isAnchor
          ? "ring-2 ring-primary-500 border-primary-500 shadow-lg shadow-primary-500/20 -translate-y-0.5"
          : isSelected
            ? "border-success-400 ring-1 ring-success-400 bg-neutral-750"
            : "border-neutral-700 hover:border-neutral-600"
      }`}
      aria-label={`Select ${shade.weight} shade, ${shade.hex}`}
      aria-pressed={isSelected}
    >
      <span
        className="w-full aspect-square rounded-lg border border-neutral-950/20 relative shadow-inner"
        style={{ backgroundColor: shade.hex }}
      >
        {shade.isAnchor && (
          <span className="absolute bottom-1 right-1 text-[8px] bg-primary-500 text-neutral-50 px-1 rounded shadow-sm">
            ⚓
          </span>
        )}
      </span>
      <span className="text-center">
        <span className="block text-[10px] font-black text-neutral-200 font-mono">
          {shade.weight}
        </span>
        <span className="block text-[8px] font-mono text-neutral-500 uppercase truncate tracking-tighter">
          {shade.hex}
        </span>
        <span className="block text-[8px] font-mono text-neutral-600">
          L:{(shade.L * 100).toFixed(0)}%
        </span>
      </span>
    </button>
  );
}
