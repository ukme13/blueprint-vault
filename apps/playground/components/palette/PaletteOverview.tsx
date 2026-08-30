import { Badge } from "@astryxdesign/core/Badge";
import type { ColorTrack } from "@blueprint/ui";
import { ColourPicker } from "./ColourPicker";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";
import type { LightnessPattern } from "./types";

interface PaletteOverviewProps {
  projectName: string;
  palettes: ColorTrack[];
  lightnessPattern: LightnessPattern;
  onSourceColourChange: (id: string, value: string) => void;
}

const PATTERN_LABELS: Record<LightnessPattern, string> = {
  linear: "Linear",
  "ease-in-out": "Ease in/out",
  custom: "Custom",
};

export function PaletteOverview({
  projectName,
  palettes,
  lightnessPattern,
  onSourceColourChange,
}: PaletteOverviewProps) {
  const { seen } = usePaletteView();
  const shadeCount = palettes[0]?.shades.length ?? 0;

  return (
    <section className={styles.sectionPage} aria-labelledby="overview-title">
      <header className={styles.sectionPageHeader}>
        <span>
          <Badge label="Project overview" variant="purple" />
          <h1 id="overview-title">{projectName}</h1>
          <p>
            Review the structure of this colour system and adjust every source
            colour from one place.
          </p>
        </span>
      </header>

      <section className={styles.projectSummary}>
        <article>
          <span>Source colours</span>
          <strong>{palettes.length}</strong>
        </article>
        <article>
          <span>Shades per colour</span>
          <strong>{shadeCount}</strong>
        </article>
        <article>
          <span>Total tokens</span>
          <strong>{palettes.length * shadeCount}</strong>
        </article>
        <article>
          <span>Lightness pattern</span>
          <strong>{PATTERN_LABELS[lightnessPattern]}</strong>
        </article>
      </section>

      <section className={styles.sourceSection}>
        <header>
          <span>
            <h2>Source colours</h2>
            <p>These colours control every generated palette row.</p>
          </span>
          <Badge label="OKLCH" variant="neutral" />
        </header>

        <section className={styles.sourceGrid}>
          {palettes.map((palette) => (
            <article className={styles.sourceCard} key={palette.id}>
              <header>
                <span
                  aria-hidden="true"
                  className={styles.sourceCardSwatch}
                  style={{ backgroundColor: seen(palette.seedHex) }}
                />
                <span>
                  <h3>{palette.name}</h3>
                  <code>{palette.seedHex}</code>
                </span>
                <span className={styles.overviewColourPicker}>
                  <ColourPicker
                    label={`${palette.name} source colour`}
                    value={palette.seedHex}
                    onChange={(value) =>
                      onSourceColourChange(palette.id, value)
                    }
                  />
                </span>
              </header>
              <span className={styles.sourceRamp} aria-hidden="true">
                {palette.shades.map((shade) => (
                  <i
                    key={shade.weight}
                    style={{ backgroundColor: seen(shade.hex) }}
                  />
                ))}
              </span>
              <footer>
                <span>{palette.shades.length} shades</span>
                <span>
                  {palette.shades[0]?.weight}–{palette.shades.at(-1)?.weight}
                </span>
              </footer>
            </article>
          ))}
        </section>
      </section>
    </section>
  );
}
