import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findHardcodedMeasurements,
  findHardcodedRadius,
  findPrimitiveColourUse,
} from "./primitive-usage";

/** Repo root, two levels up from packages/ui. */
const ROOT = resolve(__dirname, "..", "..", "..");

/* Both halves of the page: the route and the component it renders. A colour
   written in the route file would be just as much of a hole. */
const PREVIEW_SOURCES = [
  resolve(ROOT, "apps", "playground", "components", "preview"),
  resolve(ROOT, "apps", "playground", "app", "preview"),
];

describe("the preview page uses semantic tokens only", () => {
  it("reaches for no primitive anywhere", () => {
    /* The rule that makes the page worth building. Every place it would have
       to reach for a primitive is a semantic token the layer is missing, so a
       page allowed to use `--color-primary-500` proves nothing at all. */
    const uses = PREVIEW_SOURCES.flatMap(findPrimitiveColourUse);

    expect(
      uses,
      uses.map((use) => `${use.file}:${use.line} uses ${use.found}`).join("\n"),
    ).toEqual([]);
  });
});

describe("the preview page uses spacing tokens only", () => {
  it("writes out no measurement anywhere", () => {
    /* Padding, margin and gap come from the scale. Every measurement the page
       cannot express is a step the scale is missing, which is how the set gets
       argued from a real page rather than invented. */
    const uses = PREVIEW_SOURCES.flatMap(findHardcodedMeasurements);

    expect(
      uses,
      uses.map((use) => `${use.file}:${use.line} uses ${use.found}`).join("\n"),
    ).toEqual([]);
  });
});

describe("the preview page uses radius tokens only", () => {
  it("reaches for no rounded utility anywhere", () => {
    const uses = PREVIEW_SOURCES.flatMap(findHardcodedRadius);

    expect(
      uses,
      uses.map((use) => `${use.file}:${use.line} uses ${use.found}`).join("\n"),
    ).toEqual([]);
  });
});

describe("the radius check catches a mistake", () => {
  function fixture(source: string): string {
    const root = mkdtempSync(join(tmpdir(), "radius-usage-"));
    writeFileSync(join(root, "Page.tsx"), source);
    return root;
  }

  it("catches the bare utility, which is the common one", () => {
    expect(
      findHardcodedRadius(
        fixture(`export const c = <p className="rounded" />;`),
      ).length,
    ).toBe(1);
  });

  it("catches a pill", () => {
    /* radius.full is a token in this system, so Tailwind's version of it is
       the same mistake as its 4px. */
    expect(
      findHardcodedRadius(
        fixture(`export const c = <p className="rounded-full rounded-lg" />;`),
      ).map((use) => use.found),
    ).toEqual(["rounded-full", "rounded-lg"]);
  });

  it("catches an arbitrary value", () => {
    expect(
      findHardcodedRadius(
        fixture(`export const c = <p className="rounded-[7px]" />;`),
      ).map((use) => use.found),
    ).toEqual(["rounded-[7px]"]);
  });

  it("allows a radius token", () => {
    expect(
      findHardcodedRadius(fixture(`const a = "var(--radius-element)";`)),
    ).toEqual([]);
  });
});

describe("the check actually catches a mistake", () => {
  function fixture(source: string): string {
    const root = mkdtempSync(join(tmpdir(), "primitive-usage-"));
    writeFileSync(join(root, "Page.tsx"), source);
    return root;
  }

  it("catches a primitive custom property", () => {
    const uses = findPrimitiveColourUse(
      fixture(`const a = "var(--color-primary-500)";`),
    );
    expect(uses.map((use) => use.found)).toEqual(["--color-primary-500"]);
  });

  it("catches the same token reached through Tailwind", () => {
    /* The reason the rule is not trivially avoided: bg-primary-500 lands on
       exactly the same token without ever writing `var`. */
    const uses = findPrimitiveColourUse(
      fixture(
        `export const c = <p className="bg-primary-500 text-neutral-950" />;`,
      ),
    );
    expect(uses.map((use) => use.found)).toEqual([
      "bg-primary-500",
      "text-neutral-950",
    ]);
  });

  it("catches a colour written out by hand", () => {
    const uses = findPrimitiveColourUse(
      fixture(`const a = "#7646ab";\nconst b = "oklch(50% 0.1 30)";`),
    );
    expect(uses.map((use) => use.found)).toEqual(["#7646ab", "oklch("]);
  });

  it("allows a semantic token", () => {
    expect(
      findPrimitiveColourUse(
        fixture(`const a = "var(--color-primary-action)";`),
      ),
    ).toEqual([]);
  });

  it("allows a utility that carries no shade number", () => {
    /* opacity-70 and gap-3 are not colours. A check that flagged them would be
       turned off within a week. */
    expect(
      findPrimitiveColourUse(
        fixture(`export const c = <p className="opacity-70 gap-3 py-12" />;`),
      ),
    ).toEqual([]);
  });

  it("ignores a doc comment spanning several lines", () => {
    /* Where the explanation actually lives. Stripping only single-line
       comments missed the scanner's own documentation, which names the
       patterns it looks for. */
    expect(
      findPrimitiveColourUse(
        fixture(
          `/**\n * Never write --color-primary-500 here.\n * Or bg-neutral-950.\n */\nconst a = 1;`,
        ),
      ),
    ).toEqual([]);
  });

  it("ignores a comment explaining the rule", () => {
    /* A note saying "never write --color-primary-500 here" would otherwise
       fail the check it is describing. */
    expect(
      findPrimitiveColourUse(
        fixture(`// never write --color-primary-500 here\nconst a = 1;`),
      ),
    ).toEqual([]);
  });
});

describe("the measurement check catches a mistake", () => {
  function fixture(source: string): string {
    const root = mkdtempSync(join(tmpdir(), "measurement-usage-"));
    writeFileSync(join(root, "Page.tsx"), source);
    return root;
  }

  it("catches a length written out", () => {
    const uses = findHardcodedMeasurements(fixture(`const a = "16px";`));
    expect(uses.map((use) => use.found)).toEqual(["16px"]);
  });

  it("catches the same measurement reached through Tailwind", () => {
    /* p-4 lands on the spacing scale without ever writing px, exactly as
       bg-primary-500 reached a colour without writing var. */
    const uses = findHardcodedMeasurements(
      fixture(`export const c = <p className="p-4 gap-3 mt-2" />;`),
    );
    expect(uses.map((use) => use.found)).toEqual(["p-4", "gap-3", "mt-2"]);
  });

  it("exempts a hairline", () => {
    /* A 1px border is not a token anybody wants, and a check that flagged it
       would be switched off within a week. */
    expect(
      findHardcodedMeasurements(fixture(`const a = "1px solid red";`)),
    ).toEqual([]);
  });

  it("exempts a breakpoint", () => {
    expect(
      findHardcodedMeasurements(
        fixture(`const a = "@media (max-width: 900px) { }";`),
      ),
    ).toEqual([]);
  });

  it("leaves widths and heights alone", () => {
    /* Sizes are their own family and this stage has not designed them. */
    expect(
      findHardcodedMeasurements(
        fixture(
          `export const c = <p className="w-56 h-12 max-w-2xl size-6" />;`,
        ),
      ),
    ).toEqual([]);
  });

  it("does not mistake a utility that carries no measurement", () => {
    expect(
      findHardcodedMeasurements(
        fixture(
          `export const c = <p className="mx-auto flex-1 grid-cols-2 border-2 basis-1/2" />;`,
        ),
      ),
    ).toEqual([]);
  });

  it("ignores a measurement named in a doc comment", () => {
    expect(
      findHardcodedMeasurements(
        fixture(`/**\n * Never reach for p-4 or 16px here.\n */\nconst a = 1;`),
      ),
    ).toEqual([]);
  });

  it("allows a spacing token", () => {
    expect(
      findHardcodedMeasurements(fixture(`const a = "var(--spacing-4)";`)),
    ).toEqual([]);
  });
});

/*
 * The studio's own chrome, held to the same rule as the demo page.
 *
 * Every CSS module and component under the playground draws from the
 * semantic layer now, which is what makes the studio-wide theme switch
 * possible at all: a raw `--color-neutral-900` is one fixed value, and only
 * a role can hold two. What is allowed through is the short list below, and
 * each entry is a colour that must *not* follow the mode — a ring on a slider
 * thumb that has to read on any hue, a glyph on a swatch, the black-to-white
 * plane of the colour picker, the shadow demo's own light and dark grounds.
 */
const CHROME_SOURCES = [
  resolve(ROOT, "apps", "playground", "components"),
  resolve(ROOT, "apps", "playground", "app"),
];

/** file (relative to its root) → the primitives it is allowed to keep. */
const CHROME_ALLOWED: ReadonlyArray<[RegExp, RegExp]> = [
  // Slider thumbs and their gap rings, and the glyph on a shade.
  [
    /palette[\\/]palette-workspace\.module\.css$/,
    /^--color-neutral-(?:50|100|300|400|850|900|950)$/,
  ],
  // The shadow demo shows each level on a light and on a dark ground.
  [/scale[\\/]ElevationEditor\.tsx$/, /^--color-neutral-(?:50|900)$/],
  // The hue slider is a rainbow: its stops are literal by definition.
  [/palette[\\/]palette-workspace\.module\.css$/, /^hsl\($/],
  // A colour the user typed, written back out for the swatch to show.
  [/palette[\\/]ColourPicker\.tsx$/, /^(?:oklch|hsl)\($/],
  // Palette data, not chrome: the source colour a new track starts from, the
  // white and black a contrast ratio is measured against, and a value read
  // back out of the palette. None of these style the studio.
  [
    /palette[\\/](?:PaletteCreation|PaletteStudio|TrackDetailDialog|PreviewAccessibility)\.tsx$/,
    /^(?:#[0-9a-f]{6}|oklch\()$/i,
  ],
];

describe("the studio chrome", () => {
  it("reaches for no primitive that is not on the list", () => {
    const uses = CHROME_SOURCES.flatMap(findPrimitiveColourUse).filter(
      (use) =>
        !CHROME_ALLOWED.some(
          ([file, found]) => file.test(use.file) && found.test(use.found),
        ),
    );
    expect(
      uses.map((use) => `${use.file}:${use.line} uses ${use.found}`).join("\n"),
    ).toBe("");
  });
});
