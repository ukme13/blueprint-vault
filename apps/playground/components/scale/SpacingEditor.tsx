"use client";

import { Switch } from "@astryxdesign/core/Switch";
import { Ruler } from "lucide-react";
import {
  HybridTokenizedInput,
  MAX_SPACING_BASE_UNIT_PX,
  MIN_SPACING_BASE_UNIT_PX,
  SPACING_BASE_UNIT_PRESETS,
  resolveSpacing,
  resolveSpacingSlots,
  resolveHybridValue,
  type HybridTokenizedValue,
  type SpacingPresetId,
  type SpacingScale,
} from "@blueprint/ui";
import { usePickerSheet } from "../picker-sheet";
import { SpacingDensitySetting } from "./SpacingDensitySetting";
import { SpacingPresetSelector } from "./SpacingPresetSelector";
import { SpacingStepList } from "./SpacingStepList";
import { SpacingPreviewTile } from "./SpacingPreviewTile";
import { SpacingSlotPicker } from "./SpacingSlotPicker";
import type { SpacingView } from "./use-spacing-view";
import styles from "./scale-workspace.module.css";

interface SpacingInspectorProps {
  scale: SpacingScale;
  detachedBaseUnit: number | null;
  onBaseUnitChange: (next: HybridTokenizedValue) => void;
  onDensityChange: (density: number) => void;
  /** A density preset: its own step in history, not part of a drag. */
  onApplyPreset: (id: SpacingPresetId) => void;
  view: SpacingView;
  /** Keep a step, or prune it: one step in history. */
  onToggleStep: (step: number) => void;
}

export function SpacingInspector({
  scale,
  detachedBaseUnit,
  onBaseUnitChange,
  onDensityChange,
  onApplyPreset,
  view,
  onToggleStep,
}: SpacingInspectorProps) {
  const pickerSheet = usePickerSheet();

  return (
    <>
      <SpacingPresetSelector scale={scale} onApply={onApplyPreset} />
      <div className={styles.settingGroup}>
        <h2>Base unit</h2>
        <p className={styles.settingHint}>
          The grid. Fine steps stay on this even when density moves the layout
          gaps.
        </p>
        <HybridTokenizedInput
          decimals={0}
          icon={<Ruler aria-hidden className="size-3.5" />}
          label="Base unit"
          max={MAX_SPACING_BASE_UNIT_PX}
          min={MIN_SPACING_BASE_UNIT_PX}
          popoverTitle="Base unit presets"
          presets={SPACING_BASE_UNIT_PRESETS}
          sheet={pickerSheet}
          searchPlaceholder="Search presets..."
          step={1}
          value={resolveHybridValue(
            scale.baseUnitPx,
            SPACING_BASE_UNIT_PRESETS,
            detachedBaseUnit,
            0,
          )}
          valueSuffix="px"
          onChange={onBaseUnitChange}
        />
      </div>
      <SpacingDensitySetting
        density={scale.density ?? 1}
        onChange={onDensityChange}
      />
      <SpacingStepList scale={scale} view={view} onToggleStep={onToggleStep} />
    </>
  );
}

interface SpacingCanvasProps {
  scale: SpacingScale;
  view: SpacingView;
}

/** The preview, on the canvas: the slot pickers, the marks switch, the cards. */
export function SpacingCanvas({ scale, view }: SpacingCanvasProps) {
  const { preview, onPreviewChange, activeSlot, onActiveSlotChange } = view;
  const tokens = resolveSpacing(scale);
  /* A pruned step falls back to the nearest kept one, per slot, so the
     preview never points at a step the scale no longer has. */
  const resolved = resolveSpacingSlots(tokens, preview.slots);
  if (!resolved) return null;

  return (
    <div className={styles.spacingCanvas}>
      <div className={styles.spacingToolbar}>
        <SpacingSlotPicker
          active={activeSlot}
          steps={resolved}
          tokens={tokens}
          onActivate={onActiveSlotChange}
          onChange={(slot, step) => {
            onActiveSlotChange(slot);
            onPreviewChange({ slots: { ...preview.slots, [slot]: step } });
          }}
        />
        <Switch
          label="Show spacing"
          value={preview.showSpacing}
          onChange={(next) => onPreviewChange({ showSpacing: next })}
        />
      </div>
      <SpacingPreviewTile showSpacing={preview.showSpacing} tokens={resolved} />
    </div>
  );
}
