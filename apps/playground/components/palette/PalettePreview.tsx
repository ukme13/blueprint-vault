import { Badge } from "@astryxdesign/core/Badge";
import {
  assessPreview,
  previewShadesFor,
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { PreviewAccessibility } from "./PreviewAccessibility";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";

interface PalettePreviewProps {
  palettes: ColorTrack[];
  /**
   * The layer the report is drawn from.
   *
   * Passed in rather than read here: this component renders, and the studio
   * already owns the slice. It also means the report follows an edit in the
   * Semantics tab without a reload.
   */
  semantics: SemanticToken[];
}

export function PalettePreview({ palettes, semantics }: PalettePreviewProps) {
  const { simulation, view } = usePaletteView();
  const shades = previewShadesFor(semantics, palettes);
  const isSimulating = simulation !== "normal";
  const assessment = shades ? assessPreview(shades, view) : null;
  const issueCount = assessment?.issueCount ?? 0;

  return (
    <section
      className={styles.sectionPage}
      aria-labelledby="accessibility-title"
    >
      <header
        className={`${styles.sectionPageHeader} ${styles.previewPageHeader}`}
      >
        <span>
          <Badge label="WCAG 2.2" variant="purple" />
          <h1 id="accessibility-title">Accessibility</h1>
          <p>
            Contrast checks for the semantic pairs this palette produces.
            {isSimulating
              ? " Measured on the real palette, not the simulated one."
              : null}
          </p>
        </span>
        {assessment ? (
          <Badge
            label={issueCount === 0 ? "No warnings" : `${issueCount} warnings`}
            variant={issueCount === 0 ? "success" : "warning"}
          />
        ) : null}
      </header>

      {assessment ? (
        <PreviewAccessibility assessment={assessment} />
      ) : (
        <p className={styles.previewEmptyState} role="status">
          {palettes.length === 0
            ? "No colours are available. Add a colour track to measure contrast."
            : "The semantic layer is missing a surface, text, an action or a focus ring. Open the Semantics tab to restore them."}
        </p>
      )}
    </section>
  );
}
