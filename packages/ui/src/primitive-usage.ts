import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Finding primitive colours where only semantic ones belong.
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
    const lines = readFileSync(path, "utf8").split("\n");
    lines.forEach((text, index) => {
      /* Comments are prose. A note explaining why a primitive is wrong here
         would otherwise fail the check that the note is about. */
      const code = text.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
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
