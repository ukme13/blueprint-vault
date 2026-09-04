import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DESIGN_SYSTEM_FILE_NAMES,
  designSystemFilesFromWorkspaceFile,
} from "./design-system-files";

/*
 * The docs app installs the export, and the export is what this checks.
 *
 * apps/docs is the first client of the file a customer receives: it does not
 * import the studio's theme.css, it imports CSS generated from a workspace
 * checked into the repository. That arrangement only means anything while two
 * things hold — that the generated files on disk are the ones the current
 * formatters produce, and that nothing in the app has quietly reached back for
 * theme.css to fill a gap. Neither is visible in a diff; both are here.
 *
 * In packages/ui rather than apps/docs because this is where the formatters
 * live and where the suite runs, the same reason primitive-usage.test.ts scans
 * apps/playground from here.
 *
 * See docs/roadmap/foundations-handover.md.
 */

/** Repo root, three levels up from packages/ui/src. */
const ROOT = resolve(__dirname, "..", "..", "..", "..");
const DOCS = join(ROOT, "apps", "docs");
const REFERENCE = join(DOCS, "blueprint", "reference.workspace.json");
const GENERATED = join(DOCS, "app", "blueprint");

/**
 * px, which is what apps/docs/scripts/generate-blueprint.ts passes.
 *
 * Named here as well because the committed bytes are a fact about the unit
 * they were written with, and a test that accepted either would not notice the
 * day the script changed and the files did not.
 */
const UNIT = "px" as const;

function generated(): Record<string, string> {
  return designSystemFilesFromWorkspaceFile(readFileSync(REFERENCE, "utf8"), {
    typeScaleUnit: UNIT,
  });
}

describe("the files apps/docs is built from", () => {
  it("are what the reference workspace generates today", () => {
    /* The whole point of committing generated output: a formatter change has
       to show up as a diff somebody reviews, in an app that installs the file,
       rather than in a client's inbox. Regenerate with
       `pnpm --filter docs generate:blueprint` when this fails on purpose. */
    const expected = generated();

    for (const name of DESIGN_SYSTEM_FILE_NAMES) {
      const committed = readFileSync(join(GENERATED, name), "utf8");
      expect(committed, `${name} is stale — regenerate it`).toBe(
        expected[name],
      );
    }
  });

  it("carry the names the docs app paints itself with", () => {
    /* apps/docs/app/globals.css sets body colour and background from these
       two. They come from the semantic layer, which only exists in the export
       because the workspace has one — a workspace with no palette would emit
       neither, and the app would render on transparent. */
    const css = generated()["blueprint.css"]!;

    expect(css).toContain("--color-fg-primary:");
    expect(css).toContain("--color-surface-base:");
  });
});

describe("what the docs app is allowed to import", () => {
  /** Every file under apps/docs, minus the parts nobody wrote. */
  function sources(directory: string, found: string[] = []): string[] {
    for (const entry of readdirSync(directory)) {
      if (entry === "node_modules" || entry === ".next" || entry === ".turbo")
        continue;
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) sources(path, found);
      else if (/\.(css|ts|tsx|js|jsx|mjs|json)$/.test(entry)) found.push(path);
    }
    return found;
  }

  it("is the generated export, never the studio's theme.css", () => {
    /* The moment it imports theme.css it stops proving the export: every name
       resolves whether or not the formatters emit it, and the first thing a
       client would hit is invisible here. The bridge is the one file it shares
       with the studio, and only because the bridge is not a token — it maps
       roles onto the names Astryx's components read. */
    /* An import, not a mention. The first version of this matched the string
       anywhere in the file and failed on the paragraph in globals.css that
       explains why theme.css is not imported — a guard that forbids writing
       down the rule it enforces. */
    const imports =
      /(?:@import|\bimport)\s+(?:url\()?["'][^"']*@blueprint\/ui\/theme\.css/;
    const offenders = sources(DOCS)
      .filter((path) => imports.test(readFileSync(path, "utf8")))
      .map((path) => relative(ROOT, path));

    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("what the Astryx bridge needs and the export does not carry", () => {
  it("is exactly this list, and every name on it is a gap", () => {
    /* Not a permission list. Each of these is a variable the bridge feeds an
       Astryx token from, which a workspace export does not define — so in any
       app that installs the export rather than theme.css, that bridge line is
       invalid and the Astryx token silently keeps theme-neutral's value.

       Two different faults, kept in one list because they are found the same
       way. The first six are roles the studio's own chrome has and the seeded
       semantic layer does not, so no workspace has them. The rest are two
       primitive tracks, `secondary` and `tertiary`, that theme.css defines and
       a studio project has never had: the bridge maps Astryx's cyan and purple
       families onto them.

       When a role or a track is added, this test fails and the name comes off
       the list. That is the intended way to find out it worked. */
    const bridge = readFileSync(
      join(ROOT, "packages", "ui", "src", "astryx-bridge.css"),
      "utf8",
    );
    const files = generated();
    const exported = new Set(
      [
        ...`${files["blueprint.css"]}${files["blueprint-typography.css"]}`.matchAll(
          /^\s*(--[a-z0-9-]+)\s*:/gm,
        ),
      ].map((match) => match[1]),
    );

    const missing = [
      ...new Set([...bridge.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1])),
    ].filter((name) => !exported.has(name));

    expect(missing.sort()).toEqual(
      [
        "--color-action-muted",
        "--color-border-strong",
        "--color-fg-accent",
        "--color-fg-on-action",
        "--color-surface-skeleton",
        "--color-surface-track",
        ...["50", "100", "200", "400", "600", "800", "900", "950"].flatMap(
          (weight) => [
            `--color-secondary-${weight}`,
            `--color-tertiary-${weight}`,
          ],
        ),
      ].sort(),
    );
  });
});
