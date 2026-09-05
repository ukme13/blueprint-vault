import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  generatePalettes,
  seedSemanticTokens,
  seedWorkspaceProject,
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { PrimitiveTable } from "./PrimitiveTable";
import { SemanticTable } from "./SemanticTable";
import { guidanceRoleIds } from "../content/colour";

/*
 * The rule the whole plan rests on: a page is a template over data.
 *
 * "Pages are templates over data, not hand-written values." A colour page that
 * says primary 500 is #7646AB is not documentation, it is a snapshot of one
 * afternoon — it goes stale silently, and the first person to notice is a
 * client reading a value their file does not contain.
 *
 * So each test renders a table twice, changing one value in the workspace in
 * between, and asserts the markup moved. A component with the value written
 * into it passes every other test in this repository and fails these.
 *
 * See docs/roadmap/foundations-handover.md.
 */

function workspace(seedHex = "#7646ab"): {
  palettes: ColorTrack[];
  tokens: SemanticToken[];
} {
  const project = seedWorkspaceProject("Reference");
  const palette = {
    ...project.palette!,
    tracks: project.palette!.tracks.map((track) =>
      track.id === "primary" ? { ...track, seedHex } : track,
    ),
  };
  const palettes = generatePalettes(palette);
  return { palettes, tokens: seedSemanticTokens(palettes) };
}

describe("the colour page's table is a template over the workspace", () => {
  it("renders a different primitive when the source colour changes", () => {
    const before = workspace();
    const after = workspace("#0b7a3d");

    const markupBefore = renderToStaticMarkup(
      <PrimitiveTable colourFormat="hex" palettes={before.palettes} />,
    );
    const markupAfter = renderToStaticMarkup(
      <PrimitiveTable colourFormat="hex" palettes={after.palettes} />,
    );

    /* The specific value, not merely "the strings differ": a component that
       rendered a fixed swatch and a changing caption would pass a looser
       assertion. */
    expect(markupBefore).toContain("#7646AB");
    expect(markupAfter).not.toContain("#7646AB");
    expect(markupAfter).toContain("#0B7A3D");
    expect(markupAfter).not.toBe(markupBefore);
  });

  it("names the variable the export writes, not one of its own", () => {
    /* The other half of being a template. A page free to invent the name is a
       page that can print `--color-primary-500` for a track somebody renamed
       to Brand, which is a value a developer would paste and never resolve. */
    const renamed = seedWorkspaceProject("Reference");
    const palettes = generatePalettes({
      ...renamed.palette!,
      tracks: renamed.palette!.tracks.map((track) =>
        track.id === "primary" ? { ...track, name: "brand" } : track,
      ),
    });

    const markup = renderToStaticMarkup(
      <PrimitiveTable colourFormat="hex" palettes={palettes} />,
    );

    expect(markup).toContain("--color-brand-500");
    expect(markup).not.toContain("--color-primary-500");
  });
});

describe("the semantic page's table is a template over the layer", () => {
  it("follows a role that has been pointed somewhere else", () => {
    const { palettes, tokens } = workspace();

    const before = renderToStaticMarkup(
      <SemanticTable palettes={palettes} tokens={tokens} />,
    );

    /* One role repointed, nothing else touched. The reference is what a token
       stores, so a table reading the stored value rather than a resolved one
       would show the same swatch after this. */
    const repointed = tokens.map((token) =>
      token.id === "surface.base"
        ? { ...token, light: { ...token.light, weight: 950 } }
        : token,
    );
    const after = renderToStaticMarkup(
      <SemanticTable palettes={palettes} tokens={repointed} />,
    );

    expect(after).not.toBe(before);
    /* And the row says where it landed, so the change is legible rather than
       merely present. */
    expect(after).toContain("950");
  });

  it("renders every role the layer holds", () => {
    const { palettes, tokens } = workspace();
    const markup = renderToStaticMarkup(
      <SemanticTable palettes={palettes} tokens={tokens} />,
    );

    for (const token of tokens) {
      expect(markup, `${token.id} is missing from the table`).toContain(
        token.name,
      );
    }
  });
});

describe("the guidance", () => {
  it("names only roles a workspace actually has", () => {
    /* Prose goes stale differently from data: nothing breaks, the paragraph
       just describes a token that no longer exists, and it reads exactly as
       authoritative as the ones that do. The seed set is the list of roles a
       new project gets, so a role named here and not there is either a typo
       or a rename somebody did not finish. */
    const { tokens } = workspace();
    const known = new Set(tokens.map((token) => token.id));

    const unknown = guidanceRoleIds().filter((id) => !known.has(id));

    expect(unknown, unknown.join("\n")).toEqual([]);
  });

  it("has something to say about every group the layer has", () => {
    const { tokens } = workspace();
    const groups = new Set(tokens.map((token) => token.id.split(".")[0]!));
    const spoken = new Set(guidanceRoleIds().map((id) => id.split(".")[0]!));

    const silent = [...groups].filter((group) => !spoken.has(group)).sort();

    expect(silent, silent.join("\n")).toEqual([]);
  });
});
