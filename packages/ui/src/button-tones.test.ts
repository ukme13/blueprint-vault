import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUTTON_SCHEMES, BUTTON_TONES, buttonToneStyle } from "./button-tones";
import { generatePalettes } from "./color/palette";
import { seedSemanticTokens } from "./color/semantic";
import { seedWorkspaceProject } from "./workspace/seed-project";

/*
 * The Button names roles, and only roles.
 *
 * A component that reaches for `--color-primary-400` has frozen two decisions
 * a workspace is supposed to own: which shade, and the fact that it is the
 * same shade in both modes. It freezes them in the one place a designer
 * cannot reach — and nothing reports it, because a primitive resolves
 * perfectly well. The button looked right and was wrong.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

/**
 * The files, with their comments taken out.
 *
 * Both of them explain what a primitive is by naming one, and the first
 * version of this test failed on those sentences — a guard that forbids
 * writing down the rule it enforces. The same mistake the docs-export guard
 * made about `theme.css`, in a different file.
 */
const SOURCES = ["button.tsx", "button-tones.ts"].map((name) => ({
  name,
  text: readFileSync(join(__dirname, name), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, ""),
}));

describe("the Button's colours", () => {
  it("name no primitive shade", () => {
    /* `--color-<track>-<weight>`: the shape of every primitive in the grid.
       Run against the file as it was before the tone table, this finds
       fifty-six of them. */
    const offenders = SOURCES.flatMap(({ name, text }) =>
      [...text.matchAll(/--color-[a-z]+-\d+/g)].map(
        (match) => `${name}: ${match[0]}`,
      ),
    );

    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("is six tones, and every one of them is in the layer", () => {
    /* The other half. A role the seed set does not have resolves to nothing,
       the declaration drops, and the button renders with no background at
       all — the same silent failure the Astryx bridge had, in a component
       this time. */
    const tokens = seedSemanticTokens(
      generatePalettes(seedWorkspaceProject("check").palette!),
    );
    const known = new Set(
      tokens.map((token) => `--color-${token.id.replace(/\./g, "-")}`),
    );

    const named = BUTTON_SCHEMES.flatMap((scheme) =>
      Object.values(buttonToneStyle(scheme)).map((value) =>
        value.slice("var(".length, -1),
      ),
    );
    expect(named).toHaveLength(BUTTON_SCHEMES.length * 8);

    const missing = [...new Set(named)].filter((name) => !known.has(name));
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("gives every scheme the same seven roles plus its label", () => {
    /* The pattern is the point: a variant is written once against seven local
       names, so a scheme that filled six of them would render one variant
       from an empty custom property. */
    for (const scheme of BUTTON_SCHEMES) {
      const roles = BUTTON_TONES[scheme];
      for (const [slot, value] of Object.entries(roles)) {
        expect(value, `${scheme}.${slot}`).toMatch(
          /^var\(--color-[a-z0-9-]+\)$/,
        );
      }
    }
  });

  it("has no scheme for a track a workspace does not seed", () => {
    /* `secondary` and `tertiary` were schemes here, drawing from tracks that
       exist in the studio's theme.css and in no saved project — the same
       fault the bridge carried for cyan and purple. */
    expect(BUTTON_SCHEMES).not.toContain("secondary");
    expect(BUTTON_SCHEMES).not.toContain("tertiary");
  });
});
