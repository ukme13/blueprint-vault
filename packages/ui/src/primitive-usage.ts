import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Finding raw values where only tokens belong.
 *
 * The demo page is meant to be built from the semantic layer and nothing else,
 * because that is what makes it useful: every place it has to reach for a
 * primitive is a semantic token the layer is missing. A rule like that lasts
 * until the first hurried commit unless something checks it, so this is the
 * something.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

export interface PrimitiveUse {
  /** Path relative to the scanned root. */
  file: string;
  line: number;
  /** What was found, e.g. `--color-primary-500` or `bg-neutral-950`. */
  found: string;
}

const SCANNED = /\.(tsx?|css)$/;

/**
 * What a scan is allowed to find, and where it does not look.
 *
 * The allowlist is a pair per entry: which file, and what that file may keep.
 * Both halves matter — a `#ffffff` that is fine in a colour picker is not fine
 * in a page heading — and the reason for each entry is written beside it at
 * the call site, because a list of regexes with no prose is a list nobody can
 * review.
 *
 * It starts empty for a new root. An entry is a hole in the rule and has to be
 * argued for one at a time; a scanner that ships with an allowlist has already
 * lost the argument.
 */
export type AllowEntry = readonly [file: RegExp, found: RegExp];

export interface ScanOptions {
  /**
   * Paths this root does not own, matched against the relative path.
   *
   * Generated output is the case that needs it. `apps/docs/app/blueprint` is
   * the export written by the formatters — every colour in it is a value by
   * design, and it is compared byte for byte against what those formatters
   * produce, so a scan finding "mistakes" there would be reporting the
   * design system rather than a page.
   */
  skip?: readonly RegExp[];
  /**
   * The spacing steps this root's Tailwind theme actually defines.
   *
   * Given, a utility whose step is one of them is a token reference and passes;
   * one whose step is not is reported, because it silently falls through to
   * Tailwind's own multiplier and stops being the workspace's decision. Omitted,
   * every spacing utility is reported.
   *
   * The two applications genuinely differ here and it is not a preference. The
   * studio's `theme.css` declares colour and nothing else, so `p-4` there is
   * Tailwind's 1rem and never the scale's — the roadmap is right that it
   * "reaches a measurement without ever writing px". The documentation installs
   * a generated `@theme` built from the workspace's own spacing scale, so `p-4`
   * there resolves to `--spacing-4` out of that file. Flagging it would push
   * these pages into inline styles to satisfy a check, which is worse than the
   * thing the check exists to prevent.
   *
   * It keeps the mechanism the roadmap wanted, one level in: a page reaching
   * for `gap-7` names a step the scale is missing, rather than quietly getting
   * 1.75rem from somewhere else.
   */
  spacingSteps?: readonly string[];
  /**
   * The radius tokens this root's Tailwind theme defines, by id.
   *
   * The same argument as `spacingSteps`, one family over. Where the theme is
   * built from the workspace, `rounded-container` is `--radius-container` and
   * is exactly what a page should write; `rounded-2xl` is Tailwind's own and
   * is not. Omitted, every `rounded` utility is reported, which is right for
   * an app whose theme declares no radii.
   */
  radiusTokens?: readonly string[];
  allowed?: readonly AllowEntry[];
}

function permitted(
  use: { file: string; found: string },
  allowed: readonly AllowEntry[],
): boolean {
  return allowed.some(
    ([file, found]) => file.test(use.file) && found.test(use.found),
  );
}

/**
 * A shade of a track: a name followed by a number.
 *
 * The number is what separates the two layers. `--color-primary-500` names a
 * position on a ramp; `--color-primary-action` names a use. Only the second
 * belongs on a page built from the system.
 */
const CSS_PRIMITIVE = /--color-[a-z0-9]+-\d+/g;

/**
 * The same thing through Tailwind.
 *
 * Worth catching separately, and the reason the rule is not trivially avoided:
 * `bg-primary-500` reaches exactly the same token without ever writing `var`.
 */
const TAILWIND_PRIMITIVE =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|accent|caret|shadow|decoration)-[a-z]+-\d{2,3}\b/g;

/** A colour written out by hand, which is neither layer. */
const LITERAL_COLOUR =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/g;

/**
 * A file's lines with its comments blanked out.
 *
 * Comments are prose: a note explaining why a primitive is wrong here would
 * otherwise fail the check it describes. Blanked rather than removed so the
 * line numbers in a failure still point at the real line — and across lines,
 * because a doc comment spanning five of them is where the explanation
 * actually lives. Stripping only `//` and a single-line `/* … *\/` missed
 * exactly that, and this file's own documentation was the thing it missed.
 */
function strippedLines(path: string): string[] {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""));
}

/**
 * The quoted spans of a line, blanked outside.
 *
 * A Tailwind utility only ever reaches a page inside a string — a `className`,
 * a template literal, a variable holding one. Searching the whole line for
 * them finds identifiers instead, and two turned up the first time this ran
 * against the documentation: a local `const rounded = …` in a table, and
 * `fontFamily: row.fontStack` in a specimen. Neither is a hardcoded anything,
 * and a check that reports them is a check somebody switches off.
 *
 * Blanked rather than extracted, so the column a match is found at still
 * belongs to the real line. CSS keeps working because a stylesheet holds no
 * Tailwind utilities anyway — `@apply` is forbidden here — so restricting the
 * search to quotes costs nothing and removes a whole class of false report.
 */
function quotedOnly(code: string): string {
  return code.replace(
    /(["'`])((?:\\.|(?!\1)[^\\])*)\1|[^]/g,
    (whole, quote: string | undefined) => (quote ? whole : " "),
  );
}

function sourceFiles(
  directory: string,
  root: string,
  skip: readonly RegExp[],
): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(directory, entry);
    if (skip.some((pattern) => pattern.test(rel(root, path)))) continue;
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path, root, skip));
    } else if (SCANNED.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

/**
 * A path relative to the root, always with forward slashes.
 *
 * Windows hands back `app\\blueprint\\x.css` and every pattern in a
 * skip list or an allowlist would then need `[\\\\/]` written at each
 * separator. That is easy to get wrong and fails in the safe-looking
 * direction: a skip that matches nothing scans more, and a skip that
 * matches nothing on one platform still passes on the other. Normalising
 * once here means a caller writes `/` and means it.
 */
function rel(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

/** Every scanned file under a root, with the skipped paths left out. */
function scanned(directory: string, options: ScanOptions): string[] {
  return sourceFiles(directory, directory, options.skip ?? []);
}

/**
 * Every primitive colour reference under `directory`.
 *
 * Empty is the passing state. A caller reports the entries rather than a count,
 * because the useful part of a failure is which token was missing.
 */
export function findPrimitiveColourUse(
  directory: string,
  options: ScanOptions = {},
): PrimitiveUse[] {
  const uses: PrimitiveUse[] = [];

  for (const path of scanned(directory, options)) {
    strippedLines(path).forEach((code, index) => {
      const quoted = quotedOnly(code);
      for (const [pattern, subject] of [
        [CSS_PRIMITIVE, code],
        [TAILWIND_PRIMITIVE, quoted],
        [LITERAL_COLOUR, code],
      ] as const) {
        for (const match of subject.matchAll(pattern)) {
          uses.push({
            file: rel(directory, path),
            line: index + 1,
            found: match[0],
          });
        }
      }
    });
  }

  return uses.filter((use) => !permitted(use, options.allowed ?? []));
}

/**
 * A measurement written out rather than taken from the spacing scale.
 *
 * The same idea as the colour check, and it has to catch Tailwind for the same
 * reason: `p-4` reaches a measurement without ever writing `px`, exactly as
 * `bg-primary-500` reached a colour without writing `var`.
 *
 * **Padding, margin, gap and space only.** Widths and heights are sizes rather
 * than spacing — `w-56` on a control is a component dimension, and the plan
 * defers size tokens to their own family. Flagging them here would push the
 * page into inventing tokens this stage has not designed.
 *
 * `1px` is exempt, and so is any line carrying a media query. A hairline border
 * is not a token anybody wants, and a breakpoint is not spacing. A check that
 * flagged them would be switched off within a week, so it states what it does
 * not cover.
 *
 * A width or a height is exempt for the same reason the Tailwind half already
 * ignores `w-56`: a size is not spacing, and the scale plan defers size tokens
 * to their own family. This half did not know that, which only showed once the
 * check met a page with a content column — three container widths on the
 * documentation's home page, and no token in the system that could express
 * any of them. Flagging them would have pushed the page into inventing tokens
 * this stage has not designed.
 */
/** Declarations whose value is a size rather than a distance between things. */
const SIZE_PROPERTY =
  /\b(?:(?:min-|max-)?(?:width|height|inline-size|block-size)|flex-basis|basis|grid-template-(?:columns|rows)|grid-auto-(?:columns|rows))\s*:/;

const CSS_LENGTH = /\b(?!1px\b)\d*\.?\d+(?:px|rem)\b/g;

/** Tailwind utilities whose value comes from the spacing scale. */
const TAILWIND_SPACING =
  /\b(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)-\d+(?:\.\d+)?(?![\d./a-z-])/g;

/**
 * Whether a Tailwind spacing utility names a step the scale defines.
 *
 * `gap-0-5` is not a utility anybody writes — Tailwind spells the half step
 * `gap-0.5` — so the dot is put back before the lookup, which is the same
 * translation `spacingStepName` does in the other direction when it writes
 * the variable.
 */
function isKnownStep(
  found: string,
  steps: readonly string[] | undefined,
): boolean {
  if (!steps) return false;
  const utility = /^(?:[a-z]+(?:-[xy])?)-(\d+(?:\.\d+)?)$/.exec(found);
  if (!utility) return false;
  return steps.includes(utility[1]!.replace(".", "-"));
}

export interface MeasurementUse {
  file: string;
  line: number;
  found: string;
}

export function findHardcodedMeasurements(
  directory: string,
  options: ScanOptions = {},
): MeasurementUse[] {
  const uses: MeasurementUse[] = [];

  for (const path of scanned(directory, options)) {
    strippedLines(path).forEach((code, index) => {
      /* A breakpoint is not spacing. */
      if (code.includes("@media")) return;
      /* Nor is a size. */
      if (SIZE_PROPERTY.test(code)) return;

      for (const [pattern, subject] of [
        [CSS_LENGTH, code],
        [TAILWIND_SPACING, quotedOnly(code)],
      ] as const) {
        for (const match of subject.matchAll(pattern)) {
          if (isKnownStep(match[0], options.spacingSteps)) continue;
          uses.push({
            file: rel(directory, path),
            line: index + 1,
            found: match[0],
          });
        }
      }
    });
  }

  return uses.filter((use) => !permitted(use, options.allowed ?? []));
}

/**
 * A corner radius taken from somewhere other than the scale.
 *
 * Its own check rather than part of the measurement one, because what counts is
 * different: a length in CSS is already caught above, and what is missing is
 * Tailwind's `rounded` family — which carries a radius while writing neither a
 * number nor a unit. `rounded` on its own is the most common of them.
 *
 * `rounded-full` is included. A pill is a token in this system (`radius.full`),
 * so reaching for Tailwind's version of it is the same mistake as reaching for
 * its `4px`.
 */
const TAILWIND_RADIUS = /\brounded(?:-(?:[a-z0-9]+|\[[^\]]+\]))?(?![\w-])/g;

/** Whether a `rounded-*` utility names a radius the workspace defines. */
function isKnownRadius(
  found: string,
  tokens: readonly string[] | undefined,
): boolean {
  if (!tokens) return false;
  const suffix = found.slice("rounded-".length);
  return found.startsWith("rounded-") && tokens.includes(suffix);
}

export interface RadiusUse {
  file: string;
  line: number;
  found: string;
}

export function findHardcodedRadius(
  directory: string,
  options: ScanOptions = {},
): RadiusUse[] {
  const uses: RadiusUse[] = [];

  for (const path of scanned(directory, options)) {
    strippedLines(path).forEach((code, index) => {
      for (const match of quotedOnly(code).matchAll(TAILWIND_RADIUS)) {
        if (isKnownRadius(match[0], options.radiusTokens)) continue;
        uses.push({
          file: rel(directory, path),
          line: index + 1,
          found: match[0],
        });
      }
    });
  }

  return uses.filter((use) => !permitted(use, options.allowed ?? []));
}

/**
 * A typeface named in a page rather than taken from the type scale.
 *
 * The fourth family, and the one that had no check until the documentation
 * grew a page about typography. A page that writes `font-family: Inter` has
 * frozen a decision the type system owns, the same way a hex freezes a colour
 * — and it fails more quietly, because the wrong typeface at the right size
 * still looks like a design rather than like a bug.
 *
 * What counts is a *family name*, not the property. `font-family:
 * var(--font-body-family)` is the whole point and has to pass, so the pattern
 * looks for a declaration whose value is neither a `var()` nor one of the CSS
 * generics. A generic on its own — `sans-serif`, `monospace` — is a fallback
 * rather than a choice and is what a stack is supposed to end with.
 *
 * `fontFamily:` in a style object is caught as well as `font-family:` in CSS,
 * for the reason the Tailwind patterns exist: a value that reaches the page
 * without writing the CSS spelling is the one that gets missed.
 */
const GENERIC_FAMILIES =
  "sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|inherit|initial|unset|revert";

const LITERAL_FONT_FAMILY = new RegExp(
  String.raw`(?:font-family|fontFamily)\s*:\s*(?!\s*(?:var\(|(?:${GENERIC_FAMILIES})\b))["'\`]?[A-Za-z][\w -]*(?![\w]*[.(])`,
  "g",
);

export interface FontFamilyUse {
  file: string;
  line: number;
  found: string;
}

export function findHardcodedFontFamily(
  directory: string,
  options: ScanOptions = {},
): FontFamilyUse[] {
  const uses: FontFamilyUse[] = [];

  for (const path of scanned(directory, options)) {
    strippedLines(path).forEach((code, index) => {
      for (const match of code.matchAll(LITERAL_FONT_FAMILY)) {
        uses.push({
          file: rel(directory, path),
          line: index + 1,
          found: match[0].trim(),
        });
      }
    });
  }

  return uses.filter((use) => !permitted(use, options.allowed ?? []));
}
