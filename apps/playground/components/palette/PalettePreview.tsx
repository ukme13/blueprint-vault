import { Badge, type BadgeVariant } from "@astryxdesign/core/Badge";
import { Selector } from "@astryxdesign/core/Selector";
import {
  Button,
  COLOUR_VISION_SIMULATIONS,
  assessColourSimilarity,
  assessFocusContrast,
  assessNonTextContrast,
  assessTextContrast,
  colourVisionLabel,
  recommendTextColour,
  simulateHex,
  type AccessibilityStatus,
  type ColorTrack,
  type ColourVisionSimulation,
  type ShadeItem,
} from "@blueprint/ui";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";

const SIMULATION_OPTIONS = COLOUR_VISION_SIMULATIONS.map((simulation) => ({
  value: simulation,
  label: colourVisionLabel(simulation),
}));

interface PalettePreviewProps {
  palettes: ColorTrack[];
}

interface AccessibilityRowProps {
  background: string;
  badge: string;
  detail: string;
  foreground: string;
  label: string;
  ratioLabel: string;
  status: AccessibilityStatus;
  summary: string;
  swatchLabel?: string;
  swatchType?: "text" | "border" | "focus";
}

function shadeAt(palette: ColorTrack, progress: number): ShadeItem {
  const index = Math.round((palette.shades.length - 1) * progress);
  return palette.shades[index]!;
}

function statusVariant(status: AccessibilityStatus): BadgeVariant {
  if (status === "pass") return "success";
  if (status === "partial") return "warning";
  return "error";
}

function AccessibilityRow({
  background,
  badge,
  detail,
  foreground,
  label,
  ratioLabel,
  status,
  summary,
  swatchLabel = "Aa",
  swatchType = "text",
}: AccessibilityRowProps) {
  return (
    <article>
      <span
        aria-hidden="true"
        className={styles.contrastSwatch}
        style={{ backgroundColor: background, color: foreground }}
      >
        {swatchType === "border" ? (
          <i className={styles.controlContrastExample} />
        ) : swatchType === "focus" ? (
          <i className={styles.focusContrastExample} />
        ) : (
          swatchLabel
        )}
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
        <small className={styles.contrastResult}>
          {ratioLabel} — {summary}
        </small>
      </span>
      <Badge label={badge} variant={statusVariant(status)} />
    </article>
  );
}

export function PalettePreview({ palettes }: PalettePreviewProps) {
  const { simulation, setSimulation } = usePaletteView();

  /* The one place simulation is applied, and only ever on the way to a style
     attribute. Every colour below is chosen from the real palette — including
     the recommended text colour, which is the token somebody would ship — and
     simulated at the last step, so what is on screen is what a person with
     that deficiency would see of the real design.

     Nothing writes back through this. The tracks this component is handed are
     never mutated, so no simulation can reach the stored project or an export.
     There is an end-to-end test that toggles every mode and asserts the stored
     workspace is byte-identical afterwards. */
  const seen = (hex: string) => simulateHex(hex, simulation);

  if (palettes.length === 0) {
    return (
      <section className={styles.sectionPage} aria-labelledby="preview-title">
        <header className={styles.sectionPageHeader}>
          <span>
            <Badge label="Live preview" variant="purple" />
            <h1 id="preview-title">Palette in context</h1>
          </span>
        </header>
        <p className={styles.previewEmptyState} role="status">
          No colours are available. Add a colour track to build the preview.
        </p>
      </section>
    );
  }

  const primary =
    palettes.find((palette) => palette.name === "primary") ?? palettes[0]!;
  const neutral =
    palettes.find((palette) => palette.name === "neutral") ?? primary;
  const secondary =
    palettes.find((palette) => palette.name === "secondary") ?? neutral;
  const success =
    palettes.find((palette) => palette.name === "success") ?? primary;
  const warning =
    palettes.find((palette) => palette.name === "warning") ?? primary;
  const error = palettes.find((palette) => palette.name === "error") ?? primary;
  const info = palettes.find((palette) => palette.name === "info") ?? primary;

  const primaryAction = shadeAt(primary, 0.55);
  const primarySoft = shadeAt(primary, 0.12);
  const primaryFocus =
    primary.shades.find((shade) => shade.weight === 300) ??
    shadeAt(primary, 0.32);
  const secondaryAction = shadeAt(secondary, 0.48);
  const neutralLight = shadeAt(neutral, 0.08);
  const neutralMid = shadeAt(neutral, 0.48);
  const neutralDark = shadeAt(neutral, 0.9);
  const successAction = shadeAt(success, 0.55);
  const warningAction = shadeAt(warning, 0.45);
  const errorAction = shadeAt(error, 0.55);
  const infoAction = shadeAt(info, 0.55);

  const readableText = (background: string) =>
    recommendTextColour(background).colour;

  const textChecks = [
    {
      label: "Primary action text",
      foreground: readableText(primaryAction.hex),
      background: primaryAction.hex,
    },
    {
      label: "Body text",
      foreground: neutralDark.hex,
      background: neutralLight.hex,
    },
    {
      label: "Supporting text",
      foreground: neutralMid.hex,
      background: neutralLight.hex,
    },
    {
      label: "Primary link",
      foreground: primaryAction.hex,
      background: neutralLight.hex,
    },
    {
      label: "Success status text",
      foreground: successAction.hex,
      background: neutralLight.hex,
    },
    {
      label: "Warning status text",
      foreground: warningAction.hex,
      background: neutralLight.hex,
    },
    {
      label: "Error action text",
      foreground: readableText(errorAction.hex),
      background: errorAction.hex,
    },
  ].map((check) => ({
    ...check,
    result: assessTextContrast(check.foreground, check.background),
  }));

  const whiteDarkRecommendations = [
    { label: "Primary action", background: primaryAction.hex },
    { label: "Success action", background: successAction.hex },
    { label: "Warning action", background: warningAction.hex },
    { label: "Error action", background: errorAction.hex },
  ].map((check) => ({
    ...check,
    recommendation: recommendTextColour(check.background),
  }));

  const nonTextChecks = [
    {
      label: "Secondary button border",
      foreground: secondaryAction.hex,
      background: neutralLight.hex,
      result: assessNonTextContrast(secondaryAction.hex, neutralLight.hex),
      countsTowardWarnings: true,
    },
    {
      label: "Soft surface boundary",
      foreground: primarySoft.hex,
      background: neutralLight.hex,
      result: assessNonTextContrast(primarySoft.hex, neutralLight.hex),
      countsTowardWarnings: false,
    },
  ];

  const focusCheck = assessFocusContrast(
    primaryFocus.hex,
    neutralDark.hex,
    neutralDark.hex,
  );

  const similarityChecks = [
    ["Success and warning", successAction, warningAction],
    ["Success and error", successAction, errorAction],
    ["Warning and error", warningAction, errorAction],
    ["Primary and info", primaryAction, infoAction],
  ].map(([label, first, second]) => {
    const firstShade = first as ShadeItem;
    const secondShade = second as ShadeItem;
    return {
      label: label as string,
      first: firstShade,
      second: secondShade,
      result: assessColourSimilarity(firstShade.hex, secondShade.hex),
    };
  });

  const issueCount =
    textChecks.filter((check) => check.result.status !== "pass").length +
    nonTextChecks.filter(
      (check) => check.countsTowardWarnings && !check.result.passes,
    ).length +
    (focusCheck.status === "fail" ? 1 : 0) +
    similarityChecks.filter((check) => check.result.isTooSimilar).length;

  return (
    <section className={styles.sectionPage} aria-labelledby="preview-title">
      <header
        className={`${styles.sectionPageHeader} ${styles.previewPageHeader}`}
      >
        <span>
          <Badge label="Live preview" variant="purple" />
          <h1 id="preview-title">Palette in context</h1>
          <p>
            Test common interface patterns before exporting the colour system.
          </p>
        </span>
        <span className={styles.simulationControl}>
          <Selector
            label="Colour vision"
            options={SIMULATION_OPTIONS}
            size="sm"
            value={simulation}
            width="100%"
            onChange={(value) => setSimulation(value as ColourVisionSimulation)}
          />
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

        <article
          className={`${styles.previewPanel} ${styles.accessibilityPanel}`}
          id="preview-accessibility"
        >
          <header className={styles.accessibilityHeader}>
            <span>
              <h2>Accessibility</h2>
              <p>
                WCAG 2.2 contrast checks for important colour pairs.
                {simulation !== "normal" &&
                  " Measured on the real palette, not the simulated one."}
              </p>
            </span>
            <Badge
              label={
                issueCount === 0 ? "No warnings" : `${issueCount} warnings`
              }
              variant={issueCount === 0 ? "success" : "warning"}
            />
          </header>

          <section className={styles.accessibilityGrid}>
            <section aria-labelledby="text-contrast-heading">
              <h3 id="text-contrast-heading">Text contrast</h3>
              <p className={styles.accessibilityNote}>
                Checks each foreground and background pair for normal and large
                text requirements.
              </p>
              <section className={styles.contrastList}>
                {textChecks.map((check) => (
                  <AccessibilityRow
                    key={check.label}
                    background={check.background}
                    badge={
                      check.result.normalText.aaa
                        ? "AAA"
                        : check.result.normalText.aa
                          ? "AA"
                          : check.result.largeText.aa
                            ? "Large AA"
                            : "Fail"
                    }
                    detail={`${check.foreground} on ${check.background}`}
                    foreground={check.foreground}
                    label={check.label}
                    ratioLabel={`${check.result.ratio.toFixed(1)}:1`}
                    status={check.result.status}
                    summary={check.result.summary}
                  />
                ))}
              </section>
            </section>

            <section aria-labelledby="recommendation-heading">
              <h3 id="recommendation-heading">White or dark text</h3>
              <p className={styles.accessibilityNote}>
                Compares white and dark text, then recommends the option with
                stronger contrast.
              </p>
              <section className={styles.contrastList}>
                {whiteDarkRecommendations.map((check) => {
                  const isWhite = check.recommendation.colour === "#ffffff";
                  return (
                    <AccessibilityRow
                      key={check.label}
                      background={check.background}
                      badge={isWhite ? "Use white" : "Use dark"}
                      detail={`White ${
                        isWhite
                          ? check.recommendation.ratio.toFixed(1)
                          : check.recommendation.alternativeRatio.toFixed(1)
                      }:1 · Dark ${
                        isWhite
                          ? check.recommendation.alternativeRatio.toFixed(1)
                          : check.recommendation.ratio.toFixed(1)
                      }:1`}
                      foreground={check.recommendation.colour}
                      label={check.label}
                      ratioLabel={`${check.recommendation.ratio.toFixed(1)}:1`}
                      status="pass"
                      summary={`${isWhite ? "White" : "Dark"} text gives stronger contrast.`}
                    />
                  );
                })}
              </section>
            </section>

            <section aria-labelledby="non-text-heading">
              <h3 id="non-text-heading">Controls and focus</h3>
              <p className={styles.accessibilityNote}>
                Checks the 3:1 requirement for visible boundaries and keyboard
                focus colours. Decorative surfaces are advisory only.
              </p>
              <section className={styles.contrastList}>
                {nonTextChecks.map((check) => (
                  <AccessibilityRow
                    key={check.label}
                    background={check.background}
                    badge={
                      check.countsTowardWarnings
                        ? check.result.passes
                          ? "Pass"
                          : "Fail"
                        : "Advisory"
                    }
                    detail={`${check.foreground} against ${check.background}`}
                    foreground={check.foreground}
                    label={check.label}
                    ratioLabel={`${check.result.ratio.toFixed(1)}:1`}
                    status={
                      check.countsTowardWarnings
                        ? check.result.status
                        : "partial"
                    }
                    summary={
                      check.countsTowardWarnings
                        ? check.result.summary
                        : "Optional design check; increase contrast only when this boundary communicates meaning."
                    }
                    swatchType="border"
                  />
                ))}
                <AccessibilityRow
                  background={neutralDark.hex}
                  badge={focusCheck.status === "pass" ? "Pass" : "Fail"}
                  detail={`${primaryFocus.hex} against ${neutralDark.hex}`}
                  foreground={primaryFocus.hex}
                  label="Keyboard focus colour"
                  ratioLabel={`${focusCheck.adjacentContrast.toFixed(1)}:1`}
                  status={focusCheck.status}
                  summary={focusCheck.summary}
                  swatchType="focus"
                />
              </section>
            </section>

            <section aria-labelledby="similarity-heading">
              <h3 id="similarity-heading">Semantic colour distinction</h3>
              <p className={styles.accessibilityNote}>
                This is perceptual design guidance, not a WCAG pass or fail.
                Always pair status colour with text, an icon, or another cue.
              </p>
              <section className={styles.contrastList}>
                {similarityChecks.map((check) => (
                  <AccessibilityRow
                    key={check.label}
                    background={check.first.hex}
                    badge={check.result.isTooSimilar ? "Review" : "Distinct"}
                    detail={`${check.first.hex} and ${check.second.hex}`}
                    foreground={readableText(check.first.hex)}
                    label={check.label}
                    ratioLabel={`Distance ${(check.result.difference * 100).toFixed(1)}`}
                    status={check.result.isTooSimilar ? "partial" : "pass"}
                    summary={check.result.summary}
                    swatchLabel="A/B"
                  />
                ))}
              </section>
            </section>
          </section>
        </article>
      </section>
    </section>
  );
}
