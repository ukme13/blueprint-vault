"use client";

import {
  applySpacingPreset,
  toggleSpacingStepWithLayout,
  type LayoutToken,
  type ColorTrack,
  type ElevationScale,
  type HybridTokenizedValue,
  type RadiusScale,
  type SpacingScale,
} from "@blueprint/ui";
import { ElevationInspector } from "./ElevationInspector";
import { RadiusInspector } from "./RadiusEditor";
import { SpacingInspector } from "./SpacingEditor";
import { SCALE_SECTION_LABEL, type ScaleSection } from "./scale-section";
import type { ScaleHistoryBinding } from "./use-scale-history";
import type { SpacingView } from "./use-spacing-view";
import styles from "./scale-workspace.module.css";

interface ScaleInspectorProps {
  section: ScaleSection;
  spacing: SpacingScale;
  radius: RadiusScale;
  elevation: ElevationScale;
  palettes: ColorTrack[];
  write: ScaleHistoryBinding["write"];
  /** A base unit typed by hand, kept apart from the preset it left. */
  detachedBaseUnit: number | null;
  onDetachedBaseUnitChange: (value: number | null) => void;
  selectedElevationId: string;
  onSelectElevation: (id: string) => void;
  /** The workspace's layout uses, moved off a step when it is pruned. */
  layout: readonly LayoutToken[];
  spacingView: SpacingView;
}

/**
 * The settings for the current section: one element, rendered beside the
 * canvas on a wide screen and in a bottom sheet on a phone, so the two can
 * never offer different controls.
 */
export function ScaleInspector({
  section,
  spacing,
  radius,
  elevation,
  palettes,
  write,
  detachedBaseUnit,
  onDetachedBaseUnitChange,
  selectedElevationId,
  onSelectElevation,
  layout,
  spacingView,
}: ScaleInspectorProps) {
  return (
    <>
      <div className={styles.inspectorHeader}>
        {SCALE_SECTION_LABEL[section]} settings
      </div>
      {section === "spacing" && (
        <SpacingInspector
          detachedBaseUnit={detachedBaseUnit}
          scale={spacing}
          view={spacingView}
          onToggleStep={(step) =>
            /* No edit key: each keep or prune is its own step in history,
               the layout uses it moves included. */
            write(toggleSpacingStepWithLayout(spacing, layout, step))
          }
          onApplyPreset={(id) => {
            /* The preset's base unit is a named one; show it as such. A
               write with no edit key is its own step in history. */
            onDetachedBaseUnitChange(null);
            write({ spacing: applySpacingPreset(spacing, id) });
          }}
          onBaseUnitChange={(next: HybridTokenizedValue) => {
            onDetachedBaseUnitChange(next.isPreset ? null : next.value);
            write(
              { spacing: { ...spacing, baseUnitPx: next.value } },
              { editKey: "spacing:base" },
            );
          }}
          onDensityChange={(density) =>
            write(
              { spacing: { ...spacing, density } },
              { editKey: "spacing:density" },
            )
          }
          onDensityPreset={(density) =>
            write({ spacing: { ...spacing, density } })
          }
        />
      )}
      {section === "radius" && (
        <RadiusInspector
          scale={radius}
          onChange={(next, editKey) => write({ radius: next }, { editKey })}
        />
      )}
      {section === "elevation" && (
        <ElevationInspector
          palettes={palettes}
          scale={elevation}
          selectedLevelId={selectedElevationId}
          onChange={(next, editKey) => write({ elevation: next }, { editKey })}
          onSelectLevel={onSelectElevation}
        />
      )}
    </>
  );
}
