import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findHardcodedMeasurements,
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
