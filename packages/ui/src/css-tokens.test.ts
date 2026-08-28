import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { definedCssVars, findUndefinedCssVars } from "./css-tokens";

/** Repo root, two levels up from packages/ui. */
const ROOT = resolve(__dirname, "..", "..", "..");

describe("findUndefinedCssVars", () => {
  it("finds nothing in the workspace", () => {
    /* Two bugs shipped through this gap: --spacing-200 and --font-caption-size,
       both invented by following the 25-interval colour convention where it does
       not apply. A var() that nothing defines is dropped silently, so the rule
       does nothing and the element keeps what it inherited. */
    const undefinedVars = findUndefinedCssVars(ROOT);

    expect(
      undefinedVars,
      undefinedVars
        .map((entry) => `${entry.file} uses ${entry.name}`)
        .join("\n"),
    ).toEqual([]);
  });

  it("sees the tokens the design system defines", () => {
    const defined = definedCssVars(ROOT);
    expect(defined.has("--spacing-1")).toBe(true);
    expect(defined.has("--font-size-sm")).toBe(true);
    // The ones that caused the bugs genuinely do not exist.
    expect(defined.has("--spacing-200")).toBe(false);
    expect(defined.has("--font-caption-size")).toBe(false);
  });
});

describe("the check actually catches a mistake", () => {
  function fixture(css: string): string {
    const root = mkdtempSync(join(tmpdir(), "css-tokens-"));
    mkdirSync(join(root, "app"), { recursive: true });
    writeFileSync(join(root, "app", "page.css"), css);
    return root;
  }

  it("reports a var nothing defines", () => {
    const root = fixture(".a { gap: var(--spacing-200); }");
    expect(findUndefinedCssVars(root)).toEqual([
      { file: "app/page.css", name: "--spacing-200" },
    ]);
  });

  it("accepts one the same file defines", () => {
    const root = fixture(":root { --gap: 4px; }\n.a { gap: var(--gap); }");
    expect(findUndefinedCssVars(root)).toEqual([]);
  });

  it("accepts one set from TypeScript", () => {
    // next/font and inline styles declare properties no stylesheet mentions.
    const root = fixture(".a { width: var(--inspector-width); }");
    writeFileSync(
      join(root, "app", "layout.tsx"),
      'const s = { "--inspector-width": "340px" };',
    );
    expect(findUndefinedCssVars(root)).toEqual([]);
  });

  it("accepts one with a fallback, which is a deliberate choice", () => {
    const root = fixture(".a { width: var(--maybe, 340px); }");
    expect(findUndefinedCssVars(root)).toEqual([]);
  });

  it("reports each missing name once per file", () => {
    const root = fixture(
      ".a { gap: var(--nope); }\n.b { margin: var(--nope); }",
    );
    expect(findUndefinedCssVars(root)).toHaveLength(1);
  });
});
