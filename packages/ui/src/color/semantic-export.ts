import { alphaHex, alphaPercent } from "./composite";
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

/**
 * Where the reference and its alpha are recorded in a Design Tokens file.
 *
 * Reverse domain name notation, which is what the format's `$extensions`
 * section recommends: "The keys SHOULD be chosen such that they avoid the
 * likelihood of a naming clash with another vendor's data. The reverse domain
 * name notation is recommended for this purpose." Tools that do not know the
 * key must preserve it, so the reference survives a round trip through a
 * pipeline that has never heard of this studio.
 */
export const BLUEPRINT_TOKENS_EXTENSION = "co.designally.blueprint";

/** `action.primary` in the primary track at 550 → `var(--color-primary-550)`. */
function paletteVariable(resolved: ResolvedSemantic): string {
  return `var(--color-${paletteTokenName(resolved.trackName)}-${resolved.weight})`;
}

/**
 * The value a semantic custom property takes.
 *
 * An opaque token is the alias and nothing else, byte-for-byte what this
 * function emitted before alpha existed. A transparent one is the same alias
 * mixed toward `transparent`, which keeps it an alias: change the primitive and
 * the mix moves with it.
 *
 * `color-mix` rather than relative colour syntax, and the difference is the
 * browser floor rather than taste. `oklch(from var(--x) l c h / a)` says what
 * the token says, and arrived in Chrome 122, Firefox 128 and Safari 18 — above
 * this workspace's floor on all three. `color-mix()` has been in since Chrome
 * 111, Firefox 113 and Safari 16.2. Mixing with `transparent` premultiplies, so
 * the interpolation space decides how the value is written and not what colour
 * comes out: measured in Chromium 151, an orange at 40% in oklab computes to
 * that orange's own coordinates with an alpha of 0.4.
 *
 * See the decision in docs/roadmap/semantic-table-editor.md.
 */
function cssAlias(resolved: ResolvedSemantic): string {
  const alias = paletteVariable(resolved);
  if (resolved.alpha >= 1) return alias;
  return `color-mix(in oklab, ${alias} ${alphaPercent(resolved.alpha)}, transparent)`;
}

/** The same reference in the Design Tokens format's own alias syntax. */
function tokensAlias(resolved: ResolvedSemantic): string {
  return `{palette.${paletteTokenName(resolved.trackName)}.${resolved.weight}}`;
}

/**
 * One Design Tokens entry, which for a transparent token is two facts.
 *
 * The format's alias form has no alpha slot: `{palette.neutral.950}` can say
 * which primitive and cannot say how much of it. So a transparent token emits
 * the resolved value — eight hex digits, the same spelling the shadow export
 * already uses for a colour with an alpha — and puts the two things that value
 * was computed from under `$extensions`, where a tool that understands them can
 * rebuild the alias and every other tool must preserve them.
 *
 * An opaque token emits the alias alone, exactly as before, with no
 * `$extensions` key at all. Adding an empty one to every token would move every
 * generated file in the repository to record that nothing is transparent.
 */
function tokensEntry(resolved: ResolvedSemantic): Record<string, unknown> {
  if (resolved.alpha >= 1) return { $value: tokensAlias(resolved) };

  return {
    $value: `${resolved.hex}${alphaHex(resolved.alpha)}`,
    $extensions: {
      [BLUEPRINT_TOKENS_EXTENSION]: {
        reference: tokensAlias(resolved),
        alpha: resolved.alpha,
      },
    },
  };
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
        nest(group, resolved.id, tokensEntry(resolved));
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
