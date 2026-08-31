import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findPrimitiveColourUse } from "./primitive-usage";

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
