import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultRadiusScale,
  defaultSpacingScale,
  resolveSpacing,
} from "@blueprint/ui";
/* Its own entry point, not the package root. The scanner reads the file system
   at build time, and re-exporting it from an entry every component imports
   pulled `node:fs` and `node:path` into the browser bundle — the playground
   stopped compiling the moment it was added there. A build-time tool is a
   different product from a component library and gets its own door. */
import {
  findHardcodedFontFamily,
  findHardcodedMeasurements,
  findHardcodedRadius,
  findPrimitiveColourUse,
  type AllowEntry,
  type ScanOptions,
} from "@blueprint/ui/primitive-usage";

/*
 * No page in this app may hardcode a value.
 *
 * Stage 4 of the foundations plan, and the stage that keeps stages 2 and 3
 * honest: the pages claim to be templates over a workspace, and a page free to
 * write `#7646ab` or `p-[13px]` is only a template where somebody remembered.
 * The same scanner runs over the playground, pointed at a second root.
 *
 * It lands after the pages rather than before them so the allowlist is written
 * from what they actually needed. What they needed is nothing, which was not
 * the expected answer — see the note below.
 *
 * See docs/roadmap/foundations-handover.md.
 */

const ROOT = resolve(__dirname, "..");

/**
 * What this root does not own.
 *
 * Three, and each is a scope rather than a permission. An allowlist entry says
 * "this file may keep this value"; these say "this file is not a page".
 *
 * The generated export is the one the plan named: `app/blueprint` is what the
 * formatters write, every value in it is a value by design, and it is compared
 * byte for byte against those formatters — a scan reporting it would be
 * reporting the design system rather than a page.
 *
 * A test names the values it asserts on; that is what a test is. And a content
 * module is prose: `content/scale.ts` explains that a ratio of 1.25 over a 4px
 * base gives 6.25px, which is the argument for the whole spacing page and
 * cannot be made in tokens. Both have their own tests — the guidance ones
 * check that every token a paragraph names actually exists.
 */
const SKIP = [/^app\/blueprint\//, /\.test\.tsx?$/, /^content\//];

/**
 * What a page may keep anyway.
 *
 * Empty, and expected not to be. Two entries were anticipated: the elevation
 * page's two grounds, and the `Swatch`. Neither turned out to need one, and
 * the reason is the same for both — a value that arrives as data is invisible
 * to a scanner that reads text. `Swatch` takes a hex as a prop, and the
 * elevation grounds are `surface.base` and `surface.raised` resolved through
 * `resolvedRoleReference`. The only literal either file held was a `#ffffff`
 * fallback for a workspace with no such role, and a white rectangle would have
 * been the page inventing a colour the workspace never gave it. It draws
 * nothing now.
 *
 * That is worth keeping as an emptiness rather than deleting: the next value
 * typed into a page fails here, and the argument for adding an entry has to be
 * written down beside it.
 */
const ALLOWED: readonly AllowEntry[] = [];

/**
 * The tokens this app's Tailwind theme actually declares.
 *
 * Read from the same defaults the reference workspace was seeded with, so a
 * client whose scale differs is checked against theirs rather than against
 * ours. `gap-4` here resolves to `--spacing-4` out of the generated theme and
 * is exactly what a page should write; `gap-7` names a step the scale does not
 * have and is reported.
 */
const OPTIONS: ScanOptions = {
  skip: SKIP,
  allowed: ALLOWED,
  spacingSteps: resolveSpacing(defaultSpacingScale()).map(
    (token) => token.name,
  ),
  radiusTokens: defaultRadiusScale().tokens.map((token) => token.id),
};

const report = (uses: Array<{ file: string; line: number; found: string }>) =>
  uses.map((use) => `${use.file}:${use.line} uses ${use.found}`).join("\n");

describe("the documentation hardcodes nothing", () => {
  it("names no primitive shade and no literal colour", () => {
    const uses = findPrimitiveColourUse(ROOT, OPTIONS);
    expect(uses, report(uses)).toEqual([]);
  });

  it("writes out no measurement the spacing scale could carry", () => {
    const uses = findHardcodedMeasurements(ROOT, OPTIONS);
    expect(uses, report(uses)).toEqual([]);
  });

  it("reaches for no radius outside the scale", () => {
    const uses = findHardcodedRadius(ROOT, OPTIONS);
    expect(uses, report(uses)).toEqual([]);
  });

  it("names no typeface the type system does not", () => {
    const uses = findHardcodedFontFamily(ROOT, OPTIONS);
    expect(uses, report(uses)).toEqual([]);
  });
});
