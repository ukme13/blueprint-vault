"use client";

import {
  toggleSpacingStep,
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
          onToggleStep={(step) =>
            write({ spacing: toggleSpacingStep(spacing, step) })
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
