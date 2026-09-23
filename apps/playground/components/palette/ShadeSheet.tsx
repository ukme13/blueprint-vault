"use client";

import { useState } from "react";
import type { ColorTrack } from "@blueprint/ui";
import { Sheet } from "../Sheet";
import { ShadeDetailPopover } from "./ShadeDetailPopover";
import type { ActiveShade } from "./types";

/**
 * A shade's details on a phone: a sheet from the bottom edge.
 *
 * On a desktop each swatch opens a popover beside itself. On a phone that
 * popover sat over the middle of the palette it was describing. One sheet for
 * the whole matrix instead, holding what the popover holds; its edit button
 * opens the picker as a second sheet over it.
 *
 * The last shade shown is kept while the sheet slides away, so it leaves with
 * its content rather than as an empty panel.
 */

interface ShadeSheetProps {
  palettes: ColorTrack[];
  activeShade: ActiveShade | null;
  wcagComparisonHex: string;
  wcagComparisonLabel: "white" | "black" | "custom";
  onClose: () => void;
  onAnchorChange: (trackId: string, weight: number, hex: string | null) => void;
  onManualChange: (trackId: string, weight: number, hex: string | null) => void;
  onSourceChange: (trackId: string, hex: string) => void;
}

export function ShadeSheet({
  palettes,
  activeShade,
  wcagComparisonHex,
  wcagComparisonLabel,
  onClose,
  onAnchorChange,
  onManualChange,
  onSourceChange,
}: ShadeSheetProps) {
  const [shown, setShown] = useState<ActiveShade | null>(activeShade);
  if (
    activeShade &&
    (activeShade.trackId !== shown?.trackId ||
      activeShade.weight !== shown.weight)
  ) {
    setShown(activeShade);
  }

  const palette = palettes.find((track) => track.id === shown?.trackId);
  const shade = palette?.shades.find((item) => item.weight === shown?.weight);

  return (
    <Sheet
      isOpen={activeShade !== null && shade !== undefined}
      label={
        palette && shade
          ? `${palette.name} ${shade.weight} shade details`
          : "Shade details"
      }
      padding="flush"
      onClose={onClose}
    >
      {palette && shade && (
        <ShadeDetailPopover
          comparisonHex={wcagComparisonHex}
          comparisonLabel={wcagComparisonLabel}
          layout="sheet"
          paletteName={palette.name}
          shade={shade}
          onAnchorChange={(hex) =>
            onAnchorChange(palette.id, shade.weight, hex)
          }
          onClose={onClose}
          onManualChange={(hex) =>
            onManualChange(palette.id, shade.weight, hex)
          }
          onSourceChange={(hex) => onSourceChange(palette.id, hex)}
        />
      )}
    </Sheet>
  );
}
