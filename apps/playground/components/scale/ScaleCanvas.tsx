"use client";

import {
  toggleSpacingStepWithLayout,
  type ColorTrack,
  type ElevationScale,
  type LayoutToken,
  type RadiusScale,
  type SpacingPreviewSettings,
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
  /** The workspace's layout uses, moved off a step when it is pruned. */
  layout: readonly LayoutToken[];
  spacingPreview: SpacingPreviewSettings;
  /** Saved straight to the workspace: a view setting, not an edit. */
  onSpacingPreviewChange: (patch: Partial<SpacingPreviewSettings>) => void;
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
  spacingPreview,
  onSpacingPreviewChange,
}: ScaleCanvasProps) {
  return (
    <section
      aria-label={`${SCALE_SECTION_LABEL[section]} canvas`}
      className={styles.canvas}
    >
      {section === "spacing" && (
        <SpacingCanvas
          preview={spacingPreview}
          scale={spacing}
          onPreviewChange={onSpacingPreviewChange}
          onToggleStep={(step) =>
            /* No edit key: each keep or prune is its own step in history,
               the layout uses it moves included. */
            write(toggleSpacingStepWithLayout(spacing, layout, step))
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
