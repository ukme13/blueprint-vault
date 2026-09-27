"use client";

import {
  toggleSpacingStep,
  type ColorTrack,
  type ElevationScale,
  type LayoutToken,
  type RadiusScale,
  type SpacingScale,
} from "@blueprint/ui";
import { ElevationCanvas } from "./ElevationEditor";
import { RadiusCanvas } from "./RadiusEditor";
import { SpacingCanvas } from "./SpacingEditor";
import { SCALE_SECTION_LABEL, type ScaleSection } from "./scale-section";
import type { ScaleHistoryBinding } from "./use-scale-history";
import styles from "./scale-workspace.module.css";

interface ScaleCanvasProps {
  section: ScaleSection;
  spacing: SpacingScale;
  radius: RadiusScale;
  elevation: ElevationScale;
  palettes: ColorTrack[];
  write: ScaleHistoryBinding["write"];
  selectedElevationId: string;
  onSelectElevation: (id: string) => void;
  /** The workspace's layout uses, for the spacing steps they reach for. */
  layout: readonly LayoutToken[];
  /** Open the Uses tab at one layout use. */
  onOpenUse: (id: string) => void;
}

/** The current section's scale, drawn: steps, corners or shadows. */
export function ScaleCanvas({
  section,
  spacing,
  radius,
  elevation,
  palettes,
  write,
  selectedElevationId,
  onSelectElevation,
  layout,
  onOpenUse,
}: ScaleCanvasProps) {
  return (
    <section
      aria-label={`${SCALE_SECTION_LABEL[section]} canvas`}
      className={styles.canvas}
    >
      {section === "spacing" && (
        <SpacingCanvas
          layout={layout}
          scale={spacing}
          onOpenUse={onOpenUse}
          onToggleStep={(step) =>
            /* No edit key: each keep or prune is its own step in history. */
            write({ spacing: toggleSpacingStep(spacing, step) })
          }
        />
      )}
      {section === "radius" && (
        <RadiusCanvas
          scale={radius}
          onChange={(next, editKey) => write({ radius: next }, { editKey })}
        />
      )}
      {section === "elevation" && (
        <ElevationCanvas
          palettes={palettes}
          scale={elevation}
          selectedLevelId={selectedElevationId}
          onChange={(next) => write({ elevation: next })}
          onSelectLevel={onSelectElevation}
        />
      )}
    </section>
  );
}
