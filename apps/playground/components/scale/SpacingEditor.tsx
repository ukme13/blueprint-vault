"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import {
  Button,
  HybridTokenizedInput,
  MAX_SPACING_BASE_UNIT_PX,
  MIN_SPACING_BASE_UNIT_PX,
  SPACING_BASE_UNIT_PRESETS,
  nearestSpacingToken,
  spacingChipSteps,
  resolveHybridValue,
  spacingStepName,
  type HybridTokenizedValue,
  type SpacingPresetId,
  type SpacingScale,
  tokensUsingSpacingStep,
  type LayoutToken,
  type SpacingToken,
} from "@blueprint/ui";
import { usePickerSheet } from "../picker-sheet";
import { SpacingDensitySetting } from "./SpacingDensitySetting";
import { SpacingPresetSelector } from "./SpacingPresetSelector";
import { SpacingTokenRow } from "./SpacingTokenRow";
import {
  SPACING_SLOTS,
  SpacingPreviewTile,
  type SpacingSlot,
} from "./SpacingPreviewTile";
import { SpacingSlotPicker } from "./SpacingSlotPicker";
import styles from "./scale-workspace.module.css";

interface SpacingInspectorProps {
  scale: SpacingScale;
  detachedBaseUnit: number | null;
  onBaseUnitChange: (next: HybridTokenizedValue) => void;
  onDensityChange: (density: number) => void;
  /** A density preset: its own step in history, not part of a drag. */
  onDensityPreset: (density: number) => void;
  onToggleStep: (step: number) => void;
  onApplyPreset: (id: SpacingPresetId) => void;
}

export function SpacingInspector({
  scale,
  detachedBaseUnit,
  onBaseUnitChange,
  onDensityChange,
  onDensityPreset,
  onToggleStep,
  onApplyPreset,
}: SpacingInspectorProps) {
  const pickerSheet = usePickerSheet();
  const kept = new Set(scale.steps);
  /* The chips offered, plus any step the scale holds beyond them — a
     preset's 2.5 — so every kept step can be turned off. */
  const chips = spacingChipSteps(scale);

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
      <div className={styles.settingGroup}>
        <h2>Steps</h2>
        <p className={styles.settingHint}>
          The ramp, pruned. Turn off the steps this system does not need.
        </p>
        <div className={styles.stepChips} role="region" aria-label="Steps">
          {chips.map((step) => (
            <Button
              key={step}
              aria-pressed={kept.has(step)}
              scheme="neutral"
              size="xs"
              variant={kept.has(step) ? "contained" : "outlined"}
              onClick={() => onToggleStep(step)}
            >
              {spacingStepName(step)}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}

/** Each slot starts on its own step: 24px inset, 8px stack, 16px columns. */
const FIRST_STEPS = Object.fromEntries(
  SPACING_SLOTS.map(({ slot, step }) => [slot, step]),
) as Record<SpacingSlot, number>;

interface SpacingCanvasProps {
  tokens: SpacingToken[];
  density: number;
  /** The workspace's layout uses, to say which step each one reaches for. */
  layout: readonly LayoutToken[];
  /** Open the Uses tab at one layout use. */
  onOpenUse: (id: string) => void;
}

export function SpacingCanvas({
  tokens,
  density,
  layout,
  onOpenUse,
}: SpacingCanvasProps) {
  const [steps, setSteps] = useState(FIRST_STEPS);
  /* The slot a click on the step list sets: the one last touched. */
  const [active, setActive] = useState<SpacingSlot>("inset");
  /* A step turned off in the inspector falls back to the nearest one, per
     slot, so the preview never points at a step the scale no longer has. */
  const resolved = Object.fromEntries(
    SPACING_SLOTS.map(({ slot }) => [
      slot,
      nearestSpacingToken(tokens, steps[slot]),
    ]),
  ) as Record<SpacingSlot, SpacingToken | undefined>;
  const setStep = (slot: SpacingSlot, step: number) => {
    setActive(slot);
    setSteps((current) => ({ ...current, [slot]: step }));
  };
  const selected = resolved[active];

  return (
    /* The region is the list of steps; the preview above it uses three. */
    <div className={styles.spacingCanvas}>
      {resolved.inset && resolved.stack && resolved.columns ? (
        <>
          <SpacingSlotPicker
            active={active}
            steps={{
              inset: resolved.inset,
              stack: resolved.stack,
              columns: resolved.columns,
            }}
            tokens={tokens}
            onActivate={setActive}
            onChange={setStep}
          />
          <SpacingPreviewTile
            active={active}
            density={density}
            tokens={{
              inset: resolved.inset,
              stack: resolved.stack,
              columns: resolved.columns,
            }}
          />
        </>
      ) : null}
      <section aria-label="Generated spacing steps">
        <ol className={styles.tokenList}>
          {tokens.map((token) => (
            <SpacingTokenRow
              key={token.step}
              density={density}
              isSelected={token.step === selected?.step}
              token={token}
              uses={tokensUsingSpacingStep(layout, token.step)}
              onOpenUse={onOpenUse}
              onSelect={() => setStep(active, token.step)}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}
