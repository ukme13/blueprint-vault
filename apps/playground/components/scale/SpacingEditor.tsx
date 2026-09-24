"use client";

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
  type SpacingScale,
  type SpacingToken,
} from "@blueprint/ui";
import { usePickerSheet } from "../picker-sheet";
import styles from "./scale-workspace.module.css";

const OFFERED_STEPS = generateSpacingSteps(16);

interface SpacingInspectorProps {
  scale: SpacingScale;
  detachedBaseUnit: number | null;
  onBaseUnitChange: (next: HybridTokenizedValue) => void;
  onDensityChange: (density: number) => void;
  onToggleStep: (step: number) => void;
}

export function SpacingInspector({
  scale,
  detachedBaseUnit,
  onBaseUnitChange,
  onDensityChange,
  onToggleStep,
}: SpacingInspectorProps) {
  const pickerSheet = usePickerSheet();
  const kept = new Set(scale.steps);

  return (
    <>
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
          {OFFERED_STEPS.map((step) => (
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

export function SpacingCanvas({ tokens }: { tokens: SpacingToken[] }) {
  return (
    <section aria-label="Generated spacing steps">
      <ol className={styles.tokenList}>
        {tokens.map((token) => (
          <li key={token.step} className={styles.tokenRow}>
            <code>{token.variable}</code>
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
        ))}
      </ol>
    </section>
  );
}
