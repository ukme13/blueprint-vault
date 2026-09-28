"use client";

import { useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Switch } from "@astryxdesign/core/Switch";
import { Ruler } from "lucide-react";
import {
  HybridTokenizedInput,
  MAX_SPACING_BASE_UNIT_PX,
  MIN_SPACING_BASE_UNIT_PX,
  SPACING_BASE_UNIT_PRESETS,
  resolveSpacing,
  resolveSpacingRamp,
  resolveSpacingSlots,
  type SpacingSlot,
  resolveHybridValue,
  type HybridTokenizedValue,
  type SpacingPresetId,
  type SpacingPreviewSettings,
  type SpacingScale,
  type SpacingUnit,
} from "@blueprint/ui";
import { usePickerSheet } from "../picker-sheet";
import { SpacingDensitySetting } from "./SpacingDensitySetting";
import { SpacingPresetSelector } from "./SpacingPresetSelector";
import { SpacingTokenRow } from "./SpacingTokenRow";
import { SpacingPreviewTile } from "./SpacingPreviewTile";
import { SpacingSlotPicker } from "./SpacingSlotPicker";
import styles from "./scale-workspace.module.css";

interface SpacingInspectorProps {
  scale: SpacingScale;
  detachedBaseUnit: number | null;
  onBaseUnitChange: (next: HybridTokenizedValue) => void;
  onDensityChange: (density: number) => void;
  /** A density preset: its own step in history, not part of a drag. */
  onDensityPreset: (density: number) => void;
  onApplyPreset: (id: SpacingPresetId) => void;
}

export function SpacingInspector({
  scale,
  detachedBaseUnit,
  onBaseUnitChange,
  onDensityChange,
  onDensityPreset,
  onApplyPreset,
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
        onPreset={onDensityPreset}
      />
    </>
  );
}

interface SpacingCanvasProps {
  scale: SpacingScale;
  /** Keep a step, or prune it: one step in history. */
  onToggleStep: (step: number) => void;
  /** The preview's slots, marks and unit, kept with the workspace. */
  preview: SpacingPreviewSettings;
  /** Change them: saved, but never a step in history. */
  onPreviewChange: (patch: Partial<SpacingPreviewSettings>) => void;
}

export function SpacingCanvas({
  scale,
  onToggleStep,
  preview,
  onPreviewChange,
}: SpacingCanvasProps) {
  /* The preview draws from the kept steps; the list shows the whole ramp,
     pruned steps dimmed, each turned on and off in place. */
  const tokens = resolveSpacing(scale);
  const ramp = resolveSpacingRamp(scale);
  /* The slot a click on the step list sets: the one last touched. */
  const [active, setActive] = useState<SpacingSlot>("inset");
  /* The slots' steps, whether the preview marks its spaces, and the list's
     unit live in the workspace, so leaving the page does not reset them. */
  const { slots, showSpacing, unit } = preview;
  /* A pruned step falls back to the nearest kept one, per slot, so the preview never points at a step the scale no longer has. */
  const resolved = resolveSpacingSlots(tokens, slots);
  const setStep = (slot: SpacingSlot, step: number) => {
    setActive(slot);
    onPreviewChange({ slots: { ...slots, [slot]: step } });
  };
  const selected = resolved?.[active];

  return (
    /* The region is the list of steps; the preview above it uses three. */
    <div className={styles.spacingCanvas}>
      {resolved ? (
        <>
          <div className={styles.spacingToolbar}>
            <SpacingSlotPicker
              active={active}
              steps={resolved}
              tokens={tokens}
              onActivate={setActive}
              onChange={setStep}
            />
            <Switch
              label="Show spacing"
              value={showSpacing}
              onChange={(next) => onPreviewChange({ showSpacing: next })}
            />
          </div>
          <SpacingPreviewTile showSpacing={showSpacing} tokens={resolved} />
        </>
      ) : null}
      <section aria-label="Generated spacing steps">
        <div className={styles.tokenListHeader}>
          <SegmentedControl
            label="Value unit"
            size="sm"
            value={unit}
            onChange={(value) =>
              onPreviewChange({ unit: value as SpacingUnit })
            }
          >
            <SegmentedControlItem label="px" value="px" />
            <SegmentedControlItem label="rem" value="rem" />
          </SegmentedControl>
        </div>
        <ol className={styles.tokenList}>
          {ramp.map((token) => (
            <SpacingTokenRow
              key={token.step}
              density={scale.density ?? 1}
              isKept={token.kept}
              isSelected={token.kept && token.step === selected?.step}
              token={token}
              unit={unit}
              onSelect={() => setStep(active, token.step)}
              onToggleKept={() => onToggleStep(token.step)}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}
