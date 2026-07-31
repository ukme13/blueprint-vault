import { Badge } from "@astryxdesign/core/Badge";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Slider } from "@astryxdesign/core/Slider";
import {
  BLUEPRINT_20_PRESET,
  Button,
  MIN_LIGHTNESS_GAP,
  type ColorTrack,
  type ShadeItem,
} from "@blueprint/ui";
import styles from "./palette-workspace.module.css";
import type { LightnessPattern } from "./types";

interface PaletteControlsProps {
  lightnessPattern: LightnessPattern;
  lightnessValues: number[];
  selectedPalette?: ColorTrack;
  selectedShade?: ShadeItem;
  onLightnessChange: (index: number, value: number) => void;
  onPatternChange: (pattern: LightnessPattern) => void;
  onResetLightness: () => void;
}

const PATTERN_LABELS: Record<LightnessPattern, string> = {
  linear: "Linear",
  "ease-in-out": "Ease in/out",
  custom: "Custom",
};

function formatLightness(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function PaletteControls({
  lightnessPattern,
  lightnessValues,
  selectedPalette,
  selectedShade,
  onLightnessChange,
  onPatternChange,
  onResetLightness,
}: PaletteControlsProps) {
  return (
    <aside className={styles.inspector}>
      <header className={styles.inspectorHeader}>
        <span>Palette settings</span>
        <Badge label="Blueprint 20" variant="purple" />
      </header>

      <section className={styles.settingGroup}>
        <h2>Shade count</h2>
        <p className={styles.shadeCount}>
          <strong>20</strong>
          <span>stable tokens</span>
        </p>
      </section>

      <section className={styles.settingGroup}>
        <h2>Colour space</h2>
        <p className={styles.colourSpaceStatus}>
          <Badge label="OKLCH" variant="purple" />
          <span>sRGB output</span>
        </p>
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
          Moving a slider switches the pattern to Custom.
        </p>

        <ol className={styles.lightnessList}>
          {lightnessValues.map((lightness, index) => (
            <li key={BLUEPRINT_20_PRESET.weights[index]}>
              <code>{BLUEPRINT_20_PRESET.weights[index]}</code>
              <span className={styles.lightnessSlider}>
                <Slider
                  isLabelHidden
                  label={`${BLUEPRINT_20_PRESET.weights[index]} target lightness`}
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
                  step={MIN_LIGHTNESS_GAP}
                  value={lightness}
                  valueDisplay="none"
                  width="100%"
                  onChange={(value: number) => onLightnessChange(index, value)}
                />
              </span>
              <strong>{formatLightness(lightness)}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.selectionPanel} aria-live="polite">
        <h2>Selected shade</h2>
        {selectedPalette && selectedShade ? (
          <>
            <p className={styles.selectionTitle}>
              <i style={{ backgroundColor: selectedShade.hex }} />
              <strong>
                {selectedPalette.name} · {selectedShade.weight}
              </strong>
            </p>
            <section className={styles.detailsGrid}>
              <dl>
                <dt>HEX</dt>
                <dd>{selectedShade.hex}</dd>
              </dl>
              <dl>
                <dt>Lightness</dt>
                <dd>{(selectedShade.L * 100).toFixed(1)}%</dd>
              </dl>
              <dl>
                <dt>Chroma</dt>
                <dd>{selectedShade.C.toFixed(3)}</dd>
              </dl>
              <dl>
                <dt>Hue</dt>
                <dd>{selectedShade.H.toFixed(1)}°</dd>
              </dl>
            </section>
          </>
        ) : (
          <p className={styles.selectionEmpty}>
            Select a shade to inspect its OKLCH values.
          </p>
        )}
      </section>
    </aside>
  );
}
