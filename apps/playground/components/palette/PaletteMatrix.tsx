import type { ColorTrack } from "@blueprint/ui";
import { PaletteRow } from "./PaletteRow";
import type { ActiveShade, TrackProperty } from "./types";

interface PaletteMatrixProps {
  palettes: ColorTrack[];
  numShades: number;
  activeShade: ActiveShade | null;
  onActiveShadeChange: (selection: ActiveShade | null) => void;
  onTrackChange: (id: string, property: TrackProperty, value: string) => void;
  onTrackRemove: (id: string) => void;
}

export function PaletteMatrix({
  palettes,
  numShades,
  activeShade,
  onActiveShadeChange,
  onTrackChange,
  onTrackRemove,
}: PaletteMatrixProps) {
  return (
    <div className="p-8 space-y-6">
      {palettes.map((palette) => (
        <PaletteRow
          key={palette.id}
          palette={palette}
          numShades={numShades}
          activeShade={activeShade}
          onActiveShadeChange={onActiveShadeChange}
          onTrackChange={onTrackChange}
          onTrackRemove={onTrackRemove}
        />
      ))}
    </div>
  );
}
