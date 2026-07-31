import type { ColorTrack } from "@blueprint/ui";
import { PaletteShade } from "./PaletteShade";
import type { ActiveShade, TrackProperty } from "./types";

interface PaletteRowProps {
  palette: ColorTrack;
  numShades: number;
  activeShade: ActiveShade | null;
  onActiveShadeChange: (selection: ActiveShade | null) => void;
  onTrackChange: (id: string, property: TrackProperty, value: string) => void;
  onTrackRemove: (id: string) => void;
}

export function PaletteRow({
  palette,
  numShades,
  activeShade,
  onActiveShadeChange,
  onTrackChange,
  onTrackRemove,
}: PaletteRowProps) {
  return (
    <section className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-sm space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <label className="flex flex-col space-y-1 flex-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">
              Track Name
            </span>
            <input
              type="text"
              value={palette.name}
              onChange={(event) =>
                onTrackChange(palette.id, "name", event.target.value)
              }
              className="text-sm font-black text-neutral-50 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 focus:bg-neutral-750 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>

          <label className="flex flex-col space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">
              Seed Color
            </span>
            <span className="flex items-center gap-2 bg-neutral-800 px-2.5 py-1.5 rounded-xl border border-neutral-700">
              <input
                type="color"
                value={palette.seedHex}
                onChange={(event) =>
                  onTrackChange(palette.id, "seedHex", event.target.value)
                }
                className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
              <span className="text-xs font-mono font-bold text-neutral-300">
                {palette.seedHex}
              </span>
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => onTrackRemove(palette.id)}
          className="text-neutral-500 hover:text-error-400 transition-colors p-2 text-xs font-bold"
        >
          🗑️ Delete
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${numShades}, minmax(0, 1fr))`,
          gap: "0.5rem",
        }}
      >
        {palette.shades.map((shade) => {
          const isSelected =
            activeShade?.trackId === palette.id &&
            activeShade.weight === shade.weight;

          return (
            <PaletteShade
              key={shade.weight}
              shade={shade}
              isSelected={isSelected}
              onSelect={() =>
                onActiveShadeChange(
                  isSelected
                    ? null
                    : { trackId: palette.id, weight: shade.weight },
                )
              }
            />
          );
        })}
      </div>
    </section>
  );
}
