import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { compile } from "tailwindcss";
import { defaultMotionScale, formatMotionTailwind } from "./index";

/*
 * The Tailwind export is a claim about what Tailwind will make of it, so it is
 * held against Tailwind: compiled, with the utilities a developer will type.
 */
const require = createRequire(__filename);

async function build(candidates: string[]): Promise<string> {
  const css = [
    '@import "tailwindcss/theme.css" layer(theme);',
    '@import "tailwindcss/utilities.css" layer(utilities);',
    formatMotionTailwind(defaultMotionScale()),
  ].join("\n");
  const compiler = await compile(css, {
    loadStylesheet: async (id, base) => {
      const path = require.resolve(id);
      return { path, base, content: readFileSync(path, "utf8") };
    },
  });
  return compiler.build(candidates);
}

describe("the Tailwind motion export, compiled", () => {
  it("makes an ease utility of each easing, from the theme namespace", async () => {
    const css = await build(["ease-standard", "ease-emphasized"]);
    expect(css).toMatch(
      /\.ease-standard \{[^}]*transition-timing-function: var\(--ease-standard\)/,
    );
    expect(css).toMatch(
      /\.ease-emphasized \{[^}]*transition-timing-function: var\(--ease-emphasized\)/,
    );
    expect(css).toContain("--ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1)");
  });

  it("makes a duration utility of each duration, that reads the property", async () => {
    const css = await build(["duration-fast", "duration-slow"]);
    expect(css).toMatch(
      /\.duration-fast \{[^}]*transition-duration: var\(--duration-fast\)/,
    );
    expect(css).toMatch(
      /\.duration-slow \{[^}]*transition-duration: var\(--duration-slow\)/,
    );
    expect(css).toContain("--duration-slow: 500ms");
  });

  it("makes nothing of a token it does not have", async () => {
    const css = await build(["duration-glacial", "ease-nonexistent"]);
    expect(css).not.toContain(".duration-glacial");
    expect(css).not.toContain(".ease-nonexistent");
  });

  it("lets a duration utility follow the transition utility it is used with", async () => {
    const css = await build(["transition", "duration-fast"]);
    expect(css.indexOf(".transition {")).toBeLessThan(
      css.indexOf(".duration-fast {"),
    );
  });
});
