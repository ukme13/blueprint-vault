import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

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

function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (SCANNED.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

/**
 * Every primitive colour reference under `directory`.
 *
 * Empty is the passing state. A caller reports the entries rather than a count,
 * because the useful part of a failure is which token was missing.
 */
export function findPrimitiveColourUse(directory: string): PrimitiveUse[] {
  const uses: PrimitiveUse[] = [];

  for (const path of sourceFiles(directory)) {
    strippedLines(path).forEach((code, index) => {
      for (const pattern of [
        CSS_PRIMITIVE,
        TAILWIND_PRIMITIVE,
        LITERAL_COLOUR,
      ]) {
        for (const match of code.matchAll(pattern)) {
          uses.push({
            file: relative(directory, path),
            line: index + 1,
            found: match[0],
          });
        }
      }
    });
  }

  return uses;
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
 */
const CSS_LENGTH = /\b(?!1px\b)\d*\.?\d+(?:px|rem)\b/g;

/** Tailwind utilities whose value comes from the spacing scale. */
const TAILWIND_SPACING =
  /\b(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)-\d+(?:\.\d+)?(?![\d./a-z-])/g;

export interface MeasurementUse {
  file: string;
  line: number;
  found: string;
}

export function findHardcodedMeasurements(directory: string): MeasurementUse[] {
  const uses: MeasurementUse[] = [];

  for (const path of sourceFiles(directory)) {
    strippedLines(path).forEach((code, index) => {
      /* A breakpoint is not spacing. */
      if (code.includes("@media")) return;

      for (const pattern of [CSS_LENGTH, TAILWIND_SPACING]) {
        for (const match of code.matchAll(pattern)) {
          uses.push({
            file: relative(directory, path),
            line: index + 1,
            found: match[0],
          });
        }
      }
    });
  }

  return uses;
}
