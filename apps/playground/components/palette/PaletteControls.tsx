import {
  BLUEPRINT_20_PRESET,
  type ColorTrack,
  type ShadeItem,
} from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

interface PaletteControlsProps {
  selectedPalette?: ColorTrack;
  selectedShade?: ShadeItem;
}

export function PaletteControls({
  selectedPalette,
  selectedShade,
}: PaletteControlsProps) {
  return (
    <aside className={styles.inspector}>
      <header className={styles.inspectorHeader}>
        <span>Palette settings</span>
        <strong>Blueprint 20</strong>
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
        <p className={styles.segmented}>
          <span aria-current="true">OKLCH</span>
          <span>sRGB output</span>
        </p>
      </section>

      <section className={styles.settingGroup}>
        <h2>Target lightness</h2>
        <ol className={styles.lightnessList}>
          {BLUEPRINT_20_PRESET.lightnessValues.map((lightness, index) => (
            <li key={BLUEPRINT_20_PRESET.weights[index]}>
              <code>{BLUEPRINT_20_PRESET.weights[index]}</code>
              <span>
                <i style={{ width: `${lightness}%` }} />
              </span>
              <strong>{lightness}%</strong>
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
