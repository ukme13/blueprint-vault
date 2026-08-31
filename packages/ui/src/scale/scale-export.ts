import type { ColorTrack } from "../color/types";
import type { ColourMode } from "../color/semantic";
import {
  resolveElevation,
  type ElevationScale,
  type ResolvedShadowLayer,
} from "./elevation";
import { resolveRadius, type RadiusScale } from "./radius";
import { resolveSpacing, type SpacingScale } from "./spacing";

/**
 * Spacing, radius and elevation, exported.
 *
 * Values rather than aliases, unlike the semantic colours. A spacing step is
 * not a reference to anything — `--spacing-4` *is* 1rem — so there is nothing
 * to point at. Elevation is the exception in shape rather than in kind: its
 * colour comes from a palette shade, but a `box-shadow` cannot carry a `var()`
 * for one channel of an `rgba`, so it resolves.
 *
 * See docs/roadmap/scale-studio.md.
 */

function spacingLines(scale: SpacingScale, indentation: string): string[] {
  return resolveSpacing(scale).map(
    (token) => `${indentation}${token.variable}: ${token.rem}rem;`,
  );
}

function radiusLines(scale: RadiusScale, indentation: string): string[] {
  return resolveRadius(scale).map(
    (token) => `${indentation}${token.variable}: ${token.px}px;`,
  );
}

function elevationLines(
  scale: ElevationScale,
  tracks: ColorTrack[],
  mode: ColourMode,
  indentation: string,
): string[] {
  return resolveElevation(scale, tracks, mode).map(
    (level) => `${indentation}${level.variable}: ${level.css};`,
  );
}

export interface ScaleExportInput {
  spacing: SpacingScale;
  radius: RadiusScale;
  elevation: ElevationScale;
  /** The palette the shadow colour is drawn from. */
  palettes: ColorTrack[];
}

/**
 * The three families as custom properties.
 *
 * Spacing and radius appear once: they do not change with the mode, and
 * repeating them in a dark block would say they might. Elevation appears in all
 * three, because its strength does — the same three blocks the semantic colours
 * use, for the same reason.
 */
export function formatScaleCss(input: ScaleExportInput): string {
  const { spacing, radius, elevation, palettes } = input;

  return [
    ":root {",
    ...spacingLines(spacing, "  "),
    "",
    ...radiusLines(radius, "  "),
    "",
    ...elevationLines(elevation, palettes, "light", "  "),
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    '  :root:not([data-theme="light"]) {',
    ...elevationLines(elevation, palettes, "dark", "    "),
    "  }",
    "}",
    "",
    ':root[data-theme="dark"] {',
    ...elevationLines(elevation, palettes, "dark", "  "),
    "}",
  ].join("\n");
}

/**
 * The same, for a Tailwind v4 theme.
 *
 * Spacing and radius go in `@theme`, which is what generates the `p-4` and
 * `rounded-element` utilities a developer will actually type. The shadow
 * overrides stay outside it: `@theme` declares tokens, not the rules that
 * change them per mode.
 */
export function formatScaleTailwind(input: ScaleExportInput): string {
  const { spacing, radius, elevation, palettes } = input;

  return [
    "@theme {",
    ...spacingLines(spacing, "  "),
    "",
    ...radiusLines(radius, "  "),
    "",
    ...elevationLines(elevation, palettes, "light", "  "),
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    '  :root:not([data-theme="light"]) {',
    ...elevationLines(elevation, palettes, "dark", "    "),
    "  }",
    "}",
    "",
    ':root[data-theme="dark"] {',
    ...elevationLines(elevation, palettes, "dark", "  "),
    "}",
  ].join("\n");
}

/** `rgba(17, 17, 17, 0.2)` as `#11111133`, which is what the format wants. */
function hex8(layer: ResolvedShadowLayer): string {
  const channels = layer.rgb
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
  const alpha = Math.round(layer.alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${channels}${alpha}`;
}

function shadowValue(layers: ResolvedShadowLayer[]): unknown {
  /* An array, because a level is a stack. The format takes either a single
     shadow or a list of them, and a list of one is still a stack. */
  return layers.map((layer) => ({
    color: hex8(layer),
    offsetX: `${layer.offsetXPx}px`,
    offsetY: `${layer.offsetYPx}px`,
    blur: `${layer.blurPx}px`,
    spread: `${layer.spreadPx}px`,
  }));
}

/**
 * The three families as Design Tokens groups.
 *
 * Shadows carry `$type: "shadow"` and a structured value rather than the CSS
 * string, because a tool that reads this has to be able to change one offset
 * without parsing a sentence.
 */
export function scaleDesignTokenGroups(
  input: ScaleExportInput,
): Record<string, unknown> {
  const { spacing, radius, elevation, palettes } = input;

  return {
    spacing: {
      $type: "dimension",
      $description: "Spacing scale exported from Blueprint.",
      ...Object.fromEntries(
        resolveSpacing(spacing).map((token) => [
          token.name,
          { $value: `${token.rem}rem` },
        ]),
      ),
    },
    radius: {
      $type: "dimension",
      $description: "Corner radii exported from Blueprint.",
      ...Object.fromEntries(
        resolveRadius(radius).map((token) => [
          token.id,
          { $value: `${token.px}px`, $description: token.description },
        ]),
      ),
    },
    shadow: {
      $type: "shadow",
      $description:
        "Elevation exported from Blueprint. The colour is the same in both modes; the strength is not.",
      ...Object.fromEntries(
        (["light", "dark"] as ColourMode[]).map((mode) => [
          mode,
          Object.fromEntries(
            resolveElevation(elevation, palettes, mode).map((level) => [
              level.id,
              { $value: shadowValue(level.layers) },
            ]),
          ),
        ]),
      ),
    },
  };
}
