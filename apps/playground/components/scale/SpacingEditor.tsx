"use client";

import { useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Slider } from "@astryxdesign/core/Slider";
import { Ruler } from "lucide-react";
import {
  Button,
  HybridTokenizedInput,
  MAX_SPACING_BASE_UNIT_PX,
  MAX_SPACING_DENSITY,
  MIN_SPACING_BASE_UNIT_PX,
  MIN_SPACING_DENSITY,
  SPACING_BASE_UNIT_PRESETS,
  generateSpacingSteps,
  resolveHybridValue,
  spacingStepName,
  type HybridTokenizedValue,
  type SpacingPresetId,
  type SpacingScale,
  type SpacingToken,
} from "@blueprint/ui";
import { usePickerSheet } from "../picker-sheet";
import { SpacingCopyButton } from "./SpacingCopyButton";
import { SpacingPresetSelector } from "./SpacingPresetSelector";
import {
  SPACING_PREVIEW_MODES,
  SpacingPreviewTile,
  type SpacingPreviewMode,
} from "./SpacingPreviewTile";
import styles from "./scale-workspace.module.css";

const OFFERED_STEPS = generateSpacingSteps(16);

interface SpacingInspectorProps {
  scale: SpacingScale;
  detachedBaseUnit: number | null;
  onBaseUnitChange: (next: HybridTokenizedValue) => void;
  onDensityChange: (density: number) => void;
  onToggleStep: (step: number) => void;
  onApplyPreset: (id: SpacingPresetId) => void;
}

export function SpacingInspector({
  scale,
  detachedBaseUnit,
  onBaseUnitChange,
  onDensityChange,
  onToggleStep,
  onApplyPreset,
}: SpacingInspectorProps) {
  const pickerSheet = usePickerSheet();
  const kept = new Set(scale.steps);
  /* The chips offered, plus any step the scale holds beyond them — a
     preset's 2.5 — so every kept step can be turned off. */
  const chips = [...new Set([...OFFERED_STEPS, ...scale.steps])].sort(
    (a, b) => a - b,
  );

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
      <div className={styles.settingGroup}>
        <h2>Density</h2>
        <p className={styles.settingHint}>
          One multiplier on layout gaps (step 2 and up). The fine grid does not
          follow it, so a 2px hairline stays 2px.
        </p>
        <Slider
          label={`Density: ${scale.density ?? 1}×`}
          max={MAX_SPACING_DENSITY}
          min={MIN_SPACING_DENSITY}
          step={0.25}
          value={scale.density ?? 1}
          onChange={onDensityChange}
        />
      </div>
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

/** The step a layout reaches for first: 16px, step 4, where it exists. */
const FIRST_LAYOUT_STEP = 4;

export function SpacingCanvas({ tokens }: { tokens: SpacingToken[] }) {
  const [mode, setMode] = useState<SpacingPreviewMode>("inset");
  const [selectedStep, setSelectedStep] = useState(FIRST_LAYOUT_STEP);
  /* A step turned off in the inspector falls back to the nearest one, so
     the preview never points at a step the scale no longer has. */
  const selected =
    tokens.find((token) => token.step === selectedStep) ??
    [...tokens].sort(
      (a, b) =>
        Math.abs(a.step - selectedStep) - Math.abs(b.step - selectedStep),
    )[0];

  return (
    /* The region is the list of steps; the preview above it shows one. */
    <div className={styles.spacingCanvas}>
      <SegmentedControl
        label="Preview as"
        size="md"
        value={mode}
        onChange={(value) => setMode(value as SpacingPreviewMode)}
      >
        {SPACING_PREVIEW_MODES.map(({ value, label, icon: Icon }) => (
          <SegmentedControlItem
            key={value}
            icon={<Icon aria-hidden="true" />}
            label={label}
            value={value}
          />
        ))}
      </SegmentedControl>
      {selected ? <SpacingPreviewTile mode={mode} token={selected} /> : null}
      <section aria-label="Generated spacing steps">
        <ol className={styles.tokenList}>
          {tokens.map((token) => {
            const isSelected = token.step === selected?.step;
            return (
              /* A click anywhere on the row picks the step; the name is a
               button too, so a keyboard and a screen reader reach it. */
              <li
                key={token.step}
                className={styles.tokenRow}
                data-selected={isSelected || undefined}
                data-spacing-step={token.step}
                onClick={() => setSelectedStep(token.step)}
              >
                <span className={styles.tokenName}>
                  <button
                    aria-pressed={isSelected}
                    className={styles.tokenPick}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedStep(token.step);
                    }}
                  >
                    <code>{token.variable}</code>
                  </button>
                  <SpacingCopyButton token={token} />
                </span>
                <span>{token.px}px</span>
                <span className={styles.tokenMeta}>{token.rem}rem</span>
                <span className={styles.tokenMeta}>
                  {!token.followsDensity && token.step > 0 ? "grid" : null}
                </span>
                <span
                  aria-hidden="true"
                  className={styles.tokenBar}
                  style={{ width: `${token.px}px` }}
                />
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
