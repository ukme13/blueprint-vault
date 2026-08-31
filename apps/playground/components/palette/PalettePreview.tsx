import { Badge } from "@astryxdesign/core/Badge";
import {
  Button,
  assessPreview,
  previewShadesFor,
  readableText,
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { PreviewAccessibility } from "./PreviewAccessibility";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";

interface PalettePreviewProps {
  palettes: ColorTrack[];
  /**
   * The layer the preview is drawn from.
   *
   * Passed in rather than read here: this component renders, and the studio
   * already owns the slice. It also means the preview follows an edit in the
   * Semantics tab without a reload.
   */
  semantics: SemanticToken[];
}

export function PalettePreview({ palettes, semantics }: PalettePreviewProps) {
  /* `seen` is the one place simulation is applied, and only ever on the way
     into a style attribute. Every colour below is chosen from the real palette
     — including the recommended text colour, which is the token somebody would
     ship — and simulated at the last step, so what is on screen is what a
     person with that deficiency would see of the real design.

     Nothing writes back through this. The tracks this component is handed are
     never mutated, so no simulation can reach the stored project or an export.
     There is an end-to-end test that turns the Vision chip through every mode
     and asserts the stored workspace is byte-identical afterwards. */
  const { seen, simulation, view } = usePaletteView();
  const shades = previewShadesFor(semantics, palettes);

  if (!shades) {
    return (
      <section className={styles.sectionPage} aria-labelledby="preview-title">
        <header className={styles.sectionPageHeader}>
          <span>
            <Badge label="Live preview" variant="purple" />
            <h1 id="preview-title">Palette in context</h1>
          </span>
        </header>
        <p className={styles.previewEmptyState} role="status">
          {palettes.length === 0
            ? "No colours are available. Add a colour track to build the preview."
            : "The semantic layer is missing a surface, text, an action or a focus ring. Open the Semantics tab to restore them."}
        </p>
      </section>
    );
  }

  /* The assessment follows the view, so every ratio on screen is the one for
     the colours on screen. */
  const assessment = assessPreview(shades, view);
  /* Named locally so the JSX below reads as it did. The non-null assertions
     hold for the four required tokens; the rest fall back to a required one, so
     a layer missing `status.error` previews in primary rather than crashing. */
  const primaryAction = shades["action.primary"]!;
  const neutralLight = shades["surface.base"]!;
  const neutralDark = shades["text.primary"]!;
  const primarySoft = shades["surface.raised"] ?? primaryAction;
  const secondaryAction = shades["action.secondary"] ?? primaryAction;
  const neutralMid = shades["border.default"] ?? neutralDark;
  const successAction = shades["status.success"] ?? primaryAction;
  const errorAction = shades["status.error"] ?? primaryAction;

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
          </header>
          <section className={styles.buttonPreview}>
            <Button
              style={{
                backgroundColor: seen(primaryAction.hex),
                color: seen(readableText(primaryAction.hex)),
              }}
            >
              Primary action
            </Button>
            <Button
              scheme="neutral"
              variant="outlined"
              style={{
                borderColor: seen(secondaryAction.hex),
                color: seen(secondaryAction.hex),
              }}
            >
              Secondary action
            </Button>
            <Button
              style={{
                backgroundColor: seen(errorAction.hex),
                color: seen(readableText(errorAction.hex)),
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
          </header>
          <section
            className={styles.textPreview}
            style={{ backgroundColor: seen(neutralLight.hex) }}
          >
            <Badge label="New release" variant="purple" />
            <h3 style={{ color: seen(neutralDark.hex) }}>
              Design with confidence
            </h3>
            <p style={{ color: seen(neutralMid.hex) }}>
              Blueprint turns one source colour into stable tokens for product
              interfaces.
            </p>
            <a
              href="#preview-accessibility"
              style={{ color: seen(primaryAction.hex) }}
            >
              Review accessibility
            </a>
          </section>
        </article>

        <article className={styles.previewPanel}>
          <header>
            <h2>Surfaces</h2>
          </header>
          <section
            className={styles.surfacePreview}
            style={{ backgroundColor: seen(neutralDark.hex) }}
          >
            <article
              style={{
                backgroundColor: seen(neutralLight.hex),
                color: seen(neutralDark.hex),
              }}
            >
              <small>Account balance</small>
              <strong>$24,860.00</strong>
              <span style={{ color: seen(successAction.hex) }}>
                +8.4% this month
              </span>
            </article>
            <article
              style={{
                backgroundColor: seen(primarySoft.hex),
                color: seen(neutralDark.hex),
              }}
            >
              <small>Suggested action</small>
              <strong>Review your colour tokens</strong>
              <span style={{ color: seen(primaryAction.hex) }}>
                Open details →
              </span>
            </article>
          </section>
        </article>

        <PreviewAccessibility
          assessment={assessment}
          isSimulating={simulation !== "normal"}
        />
      </section>
    </section>
  );
}
