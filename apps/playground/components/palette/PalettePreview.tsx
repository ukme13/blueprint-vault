import { Badge } from "@astryxdesign/core/Badge";
import { Button, type ColorTrack, type ShadeItem } from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

interface PalettePreviewProps {
  palettes: ColorTrack[];
}

interface ContrastExample {
  background: ShadeItem;
  foreground: ShadeItem | "#ffffff" | "#000000";
  label: string;
}

function shadeAt(palette: ColorTrack, progress: number): ShadeItem {
  const index = Math.round((palette.shades.length - 1) * progress);
  return palette.shades[index]!;
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function readableText(background: string): "#ffffff" | "#000000" {
  return contrastRatio("#ffffff", background) >=
    contrastRatio("#000000", background)
    ? "#ffffff"
    : "#000000";
}

export function PalettePreview({ palettes }: PalettePreviewProps) {
  const primary = palettes.find((palette) => palette.name === "primary")!;
  const neutral =
    palettes.find((palette) => palette.name === "neutral") ?? primary;
  const secondary =
    palettes.find((palette) => palette.name === "secondary") ?? neutral;
  const success =
    palettes.find((palette) => palette.name === "success") ?? primary;
  const warning =
    palettes.find((palette) => palette.name === "warning") ?? primary;
  const error = palettes.find((palette) => palette.name === "error") ?? primary;

  const primaryAction = shadeAt(primary, 0.55);
  const primarySoft = shadeAt(primary, 0.12);
  const secondaryAction = shadeAt(secondary, 0.48);
  const neutralLight = shadeAt(neutral, 0.08);
  const neutralMid = shadeAt(neutral, 0.48);
  const neutralDark = shadeAt(neutral, 0.9);
  const successAction = shadeAt(success, 0.55);
  const warningAction = shadeAt(warning, 0.45);
  const errorAction = shadeAt(error, 0.55);

  const contrastExamples: ContrastExample[] = [
    {
      label: "Primary action",
      background: primaryAction,
      foreground: readableText(primaryAction.hex),
    },
    {
      label: "Body text",
      background: neutralLight,
      foreground: neutralDark,
    },
    {
      label: "Success status",
      background: successAction,
      foreground: readableText(successAction.hex),
    },
    {
      label: "Warning status",
      background: warningAction,
      foreground: readableText(warningAction.hex),
    },
  ];

  return (
    <section className={styles.sectionPage} aria-labelledby="preview-title">
      <header className={styles.sectionPageHeader}>
        <span>
          <Badge label="Live preview" variant="purple" />
          <h1 id="preview-title">Palette in context</h1>
          <p>
            Test common interface patterns before exporting the colour system.
          </p>
        </span>
      </header>

      <section className={styles.previewGrid}>
        <article className={styles.previewPanel}>
          <header>
            <h2>Buttons</h2>
            <p>Primary, secondary and status actions.</p>
          </header>
          <section className={styles.buttonPreview}>
            <Button
              style={{
                backgroundColor: primaryAction.hex,
                color: readableText(primaryAction.hex),
              }}
            >
              Primary action
            </Button>
            <Button
              scheme="neutral"
              variant="outlined"
              style={{
                borderColor: secondaryAction.hex,
                color: secondaryAction.hex,
              }}
            >
              Secondary action
            </Button>
            <Button
              style={{
                backgroundColor: errorAction.hex,
                color: readableText(errorAction.hex),
              }}
            >
              Delete item
            </Button>
            <Button disabled>Disabled</Button>
          </section>
        </article>

        <article className={styles.previewPanel}>
          <header>
            <h2>Text hierarchy</h2>
            <p>Readable text on a palette surface.</p>
          </header>
          <section
            className={styles.textPreview}
            style={{ backgroundColor: neutralLight.hex }}
          >
            <Badge label="New release" variant="purple" />
            <h3 style={{ color: neutralDark.hex }}>Design with confidence</h3>
            <p style={{ color: neutralMid.hex }}>
              Blueprint turns one source colour into stable tokens for product
              interfaces.
            </p>
            <a
              href="#preview-accessibility"
              style={{ color: primaryAction.hex }}
            >
              Review accessibility
            </a>
          </section>
        </article>

        <article className={styles.previewPanel}>
          <header>
            <h2>Surfaces</h2>
            <p>Layered backgrounds, borders and status areas.</p>
          </header>
          <section
            className={styles.surfacePreview}
            style={{ backgroundColor: neutralDark.hex }}
          >
            <article
              style={{
                backgroundColor: neutralLight.hex,
                color: neutralDark.hex,
              }}
            >
              <small>Account balance</small>
              <strong>$24,860.00</strong>
              <span style={{ color: successAction.hex }}>+8.4% this month</span>
            </article>
            <article
              style={{
                backgroundColor: primarySoft.hex,
                color: neutralDark.hex,
              }}
            >
              <small>Suggested action</small>
              <strong>Review your colour tokens</strong>
              <span style={{ color: primaryAction.hex }}>Open details →</span>
            </article>
          </section>
        </article>

        <article className={styles.previewPanel} id="preview-accessibility">
          <header>
            <h2>Accessibility</h2>
            <p>WCAG contrast checks for important colour pairs.</p>
          </header>
          <section className={styles.contrastList}>
            {contrastExamples.map((example) => {
              const foreground =
                typeof example.foreground === "string"
                  ? example.foreground
                  : example.foreground.hex;
              const ratio = contrastRatio(foreground, example.background.hex);
              const passes = ratio >= 4.5;

              return (
                <article key={example.label}>
                  <span
                    className={styles.contrastSwatch}
                    style={{
                      backgroundColor: example.background.hex,
                      color: foreground,
                    }}
                  >
                    Aa
                  </span>
                  <span>
                    <strong>{example.label}</strong>
                    <small>
                      {foreground} on {example.background.hex}
                    </small>
                  </span>
                  <Badge
                    label={`${ratio.toFixed(2)}:1 ${passes ? "Pass" : "Fail"}`}
                    variant={passes ? "green" : "red"}
                  />
                </article>
              );
            })}
          </section>
        </article>
      </section>
    </section>
  );
}
