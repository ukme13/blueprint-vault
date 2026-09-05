import { paletteTokenName } from "./export";
import {
  resolveSemantics,
  semanticVariableName,
  type ColourMode,
  type ResolvedSemantic,
  type SemanticToken,
} from "./semantic";
import type { ColorTrack } from "./types";

/**
 * The semantic layer, exported.
 *
 * Aliases, not values. The whole point of the layer is that a client changes
 * one primitive and every semantic pointing at it moves; flattening to resolved
 * colours at export throws that away and hands over a second palette that drifts
 * from the first. The preview resolves to values instead, because a
 * colour-vision transform needs a colour rather than a reference to one — same
 * tokens, two jobs, which is why resolution lives in one function.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

/** `action.primary` in the primary track at 550 → `var(--color-primary-550)`. */
function cssAlias(resolved: ResolvedSemantic): string {
  return `var(--color-${paletteTokenName(resolved.trackName)}-${resolved.weight})`;
}

/** The same reference in the Design Tokens format's own alias syntax. */
function tokensAlias(resolved: ResolvedSemantic): string {
  return `{palette.${paletteTokenName(resolved.trackName)}.${resolved.weight}}`;
}

function declarations(
  tokens: SemanticToken[],
  mode: ColourMode,
  tracks: ColorTrack[],
  indentation: string,
): string[] {
  return resolveSemantics(tokens, mode, tracks).map(
    (resolved) =>
      `${indentation}${semanticVariableName(resolved.id)}: ${cssAlias(resolved)};`,
  );
}

/**
 * Custom properties for both modes.
 *
 * Three blocks rather than two, which is what it takes for a theme toggle and
 * the operating system's own setting to coexist:
 *
 * - `:root` carries light, so a page with no preference and no toggle renders.
 * - the media query carries dark for somebody whose system asks for it, guarded
 *   by `:not([data-theme="light"])` so an explicit light choice still wins.
 * - `[data-theme="dark"]` carries dark for an explicit choice, which has to come
 *   last to beat the media query in both directions.
 *
 * Emitting only the media query would leave a theme switch impossible; emitting
 * only the attribute would ignore the system setting until somebody clicks.
 */
export function formatSemanticCssExport(
  tokens: SemanticToken[],
  tracks: ColorTrack[],
): string {
  const light = declarations(tokens, "light", tracks, "  ");
  const dark = declarations(tokens, "dark", tracks, "    ");
  const darkAttribute = declarations(tokens, "dark", tracks, "  ");

  return [
    ":root {",
    ...light,
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    '  :root:not([data-theme="light"]) {',
    ...dark,
    "  }",
    "}",
    "",
    ':root[data-theme="dark"] {',
    ...darkAttribute,
    "}",
  ].join("\n");
}

/**
 * The same, for a Tailwind v4 theme.
 *
 * Light goes in `@theme` so the utilities are generated; dark cannot, because
 * `@theme` declares tokens rather than the rules that override them. The two
 * dark blocks are plain CSS beside it, which Tailwind passes through.
 */
export function formatSemanticTailwindExport(
  tokens: SemanticToken[],
  tracks: ColorTrack[],
): string {
  const light = declarations(tokens, "light", tracks, "  ");
  const dark = declarations(tokens, "dark", tracks, "    ");
  const darkAttribute = declarations(tokens, "dark", tracks, "  ");

  return [
    "@theme static {",
    ...light,
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    '  :root:not([data-theme="light"]) {',
    ...dark,
    "  }",
    "}",
    "",
    ':root[data-theme="dark"] {',
    ...darkAttribute,
    "}",
  ].join("\n");
}

/** A token id as nested groups: `action.primary` → `{ action: { primary } }`. */
function nest(into: Record<string, unknown>, id: string, value: unknown): void {
  const parts = id.split(".").filter(Boolean);
  let at = into;
  for (const part of parts.slice(0, -1)) {
    const existing = at[part];
    /* A group where a token already sits, or the reverse, would overwrite it.
       The editor keeps ids unique but not free of prefixes: `text` and
       `text.primary` can both exist. The deeper one loses rather than silently
       replacing the shallower. */
    if (typeof existing !== "object" || existing === null) {
      if (existing !== undefined) return;
      at[part] = {};
    }
    at = at[part] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (last && at[last] === undefined) at[last] = value;
}

/**
 * The Design Tokens format, with the references intact.
 *
 * `{palette.primary.550}` is the format's own alias syntax, and it names the
 * same groups `formatPaletteDesignTokens` writes — so the two files are one
 * system rather than two lists that happen to agree today.
 */
export function formatSemanticDesignTokens(
  tokens: SemanticToken[],
  tracks: ColorTrack[],
): string {
  const modes = Object.fromEntries(
    (["light", "dark"] as ColourMode[]).map((mode) => {
      const group: Record<string, unknown> = {};
      for (const resolved of resolveSemantics(tokens, mode, tracks)) {
        nest(group, resolved.id, { $value: tokensAlias(resolved) });
      }
      return [mode, group];
    }),
  );

  return JSON.stringify(
    {
      semantic: {
        $type: "color",
        $description:
          "Semantic colours exported from Blueprint. Each one references a palette shade rather than repeating its value.",
        ...modes,
      },
    },
    null,
    2,
  );
}
