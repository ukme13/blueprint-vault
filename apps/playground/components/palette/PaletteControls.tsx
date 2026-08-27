import { NumberInput } from "@astryxdesign/core/NumberInput";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Slider } from "@astryxdesign/core/Slider";
import { Button, MAX_SHADE_COUNT, MIN_LIGHTNESS_GAP } from "@blueprint/ui";
import styles from "./palette-workspace.module.css";
import { MIN_SHADE_COUNT, type LightnessPattern } from "./types";

interface PaletteControlsProps {
  lightnessPattern: LightnessPattern;
  lightnessValues: number[];
  weights: number[];
  onLightnessChange: (index: number, value: number) => void;
  onPatternChange: (pattern: LightnessPattern) => void;
  onResetLightness: () => void;
  onShadeCountChange: (shadeCount: number) => void;
}

const PATTERN_LABELS: Record<LightnessPattern, string> = {
  linear: "Linear",
  "ease-in-out": "Ease in/out",
  custom: "Custom",
};

export function PaletteControls({
  lightnessPattern,
  lightnessValues,
  weights,
  onLightnessChange,
  onPatternChange,
  onResetLightness,
  onShadeCountChange,
}: PaletteControlsProps) {
  const shadeCount = lightnessValues.length;

  return (
    <aside className={styles.inspector}>
      <header className={styles.inspectorHeader}>
        <span>Palette settings</span>
      </header>

      <section className={styles.settingGroup}>
        <h2>Shade count</h2>
        <section className={styles.shadeCountControl}>
          <Button
            aria-label="Remove one shade"
            disabled={shadeCount <= MIN_SHADE_COUNT}
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => onShadeCountChange(shadeCount - 1)}
          >
            −
          </Button>
          <NumberInput
            isIntegerOnly
            isLabelHidden
            label="Shade count"
            max={MAX_SHADE_COUNT}
            min={MIN_SHADE_COUNT}
            size="md"
            value={shadeCount}
            width={76}
            onChange={onShadeCountChange}
          />
          <Button
            aria-label="Add one shade"
            disabled={shadeCount >= MAX_SHADE_COUNT}
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => onShadeCountChange(shadeCount + 1)}
          >
            +
          </Button>
          <span>
            {MIN_SHADE_COUNT}–{MAX_SHADE_COUNT} stable tokens
          </span>
        </section>
      </section>

      <section className={styles.lightnessSettingGroup}>
        <header className={styles.settingTitle}>
          <span>
            <h2>Target lightness</h2>
            <small>{PATTERN_LABELS[lightnessPattern]}</small>
          </span>
          <Button
            scheme="neutral"
            size="xs"
            variant="text"
            onClick={onResetLightness}
          >
            Reset
          </Button>
        </header>

        <span className={styles.patternControl}>
          <SegmentedControl
            label="Lightness pattern"
            layout="fill"
            size="sm"
            value={lightnessPattern}
            onChange={(value) => onPatternChange(value as LightnessPattern)}
          >
            <SegmentedControlItem label="Linear" value="linear" />
            <SegmentedControlItem label="Ease in/out" value="ease-in-out" />
            <SegmentedControlItem label="Custom" value="custom" />
          </SegmentedControl>
        </span>

        <p className={styles.lightnessHint}>
          Every bar uses the full 0–100% scale. Moving a slider switches the
          pattern to Custom.
        </p>

        <ol className={styles.lightnessList}>
          {lightnessValues.map((lightness, index) => (
            <li key={weights[index]}>
              <code>{weights[index]}</code>
              <span className={styles.lightnessSlider}>
                <Slider
                  isLabelHidden
                  label={`${weights[index]} target lightness`}
                  max={100}
                  min={0}
                  step={MIN_LIGHTNESS_GAP}
                  value={lightness}
                  valueDisplay="none"
                  width="100%"
                  onChange={(value: number) => onLightnessChange(index, value)}
                />
              </span>
              <span className={styles.lightnessInput}>
                <NumberInput
                  isLabelHidden
                  label={`${weights[index]} lightness percent`}
                  max={
                    index === 0
                      ? 100
                      : lightnessValues[index - 1]! - MIN_LIGHTNESS_GAP
                  }
                  min={
                    index === lightnessValues.length - 1
                      ? 0
                      : lightnessValues[index + 1]! + MIN_LIGHTNESS_GAP
                  }
                  size="sm"
                  step={MIN_LIGHTNESS_GAP}
                  units="%"
                  value={Number(lightness.toFixed(1))}
                  width="100%"
                  onChange={(value) => onLightnessChange(index, value)}
                />
              </span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
