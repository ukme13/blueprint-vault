import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  formatScaleCss,
  formatTypeSystemCssExport,
  generatePalettes,
  seedSemanticTokens,
  seedWorkspaceProject,
  resolveSpacing,
  typeRoleRowGroups,
  type ColorTrack,
  type SemanticToken,
  type TypeSystem,
} from "@blueprint/ui";
import { PrimitiveTable } from "./PrimitiveTable";
import { SemanticTable } from "./SemanticTable";
import { ElevationSpecimen, ElevationTable } from "./ElevationScale";
import { RadiusSpecimen, RadiusTable } from "./RadiusScale";
import { SpacingSpecimen, SpacingTable } from "./SpacingScale";
import { TypeRoleTable } from "./TypeRoleTable";
import { TypeSpecimens } from "./TypeSpecimens";
import { guidanceRoleIds } from "../content/colour";
import {
  TYPE_GROUP_GUIDANCE,
  typographyGuidanceIds,
  typographyGuidanceVariables,
} from "../content/typography";
import { scaleGuidanceIds, scaleGuidanceVariables } from "../content/scale";

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

/* The typography page, held to the same rule as the colour ones. */

function typeSystem(): TypeSystem {
  return seedWorkspaceProject("Reference").typography!.system;
}

/** One role's size changed, and nothing else. */
function withRoleSize(system: TypeSystem, id: string, fontSizePx: number) {
  return {
    ...system,
    roles: system.roles.map((role) =>
      role.id === id
        ? {
            ...role,
            /* Unlinked from the ramp, which is what setting a size by hand
               means. A role that kept its offset would be overwritten by the
               scale on the next read and the change would not survive to the
               page. */
            stepOffset: null,
            desktop: { ...role.desktop, fontSizePx },
            mobile: { ...role.mobile, fontSizePx },
          }
        : role,
    ),
  };
}

describe("the typography page is a template over the type system", () => {
  it("moves the table when a role's size changes", () => {
    const before = renderToStaticMarkup(
      <TypeRoleTable system={typeSystem()} />,
    );
    const after = renderToStaticMarkup(
      <TypeRoleTable system={withRoleSize(typeSystem(), "h3", 41)} />,
    );

    /* The specific number, not merely "the markup differs": a table that
       rendered a fixed size and a changing label would pass a looser
       assertion. 41 is odd on purpose — the scale can never generate it, so
       it can only have come from the system. */
    expect(before).not.toContain("41px");
    expect(after).toContain("41px");
    expect(after).not.toBe(before);
  });

  it("moves the specimen with it", () => {
    /* The table and the specimen read the same rows, and this is what says so.
       A specimen wired to its own resolution would keep rendering the old size
       beside a table showing the new one, which is the failure a reader would
       trust least and notice last. */
    const before = renderToStaticMarkup(
      <TypeSpecimens system={typeSystem()} />,
    );
    const after = renderToStaticMarkup(
      <TypeSpecimens system={withRoleSize(typeSystem(), "h3", 41)} />,
    );

    expect(before).not.toContain("font-size:41px");
    expect(after).toContain("font-size:41px");
  });

  it("names the variables the export writes, not ones of its own", () => {
    const system = typeSystem();
    const markup = renderToStaticMarkup(<TypeRoleTable system={system} />);
    const css = formatTypeSystemCssExport(system, "px");

    for (const group of typeRoleRowGroups(system)) {
      for (const row of group.rows) {
        for (const variable of Object.values(row.variables)) {
          expect(markup, `${variable} is missing from the table`).toContain(
            variable,
          );
          expect(
            css,
            `${variable} is on the page and not in the file`,
          ).toContain(`${variable}:`);
        }
      }
    }
  });

  it("draws the specimens in the workspace's font and never in the studio's", () => {
    /* The whole point of the page, and the one thing the last branch showed is
       easy to confuse. The studio's own typeface is Inter, applied to every
       page of this app through `--font-sans`; a specimen inheriting it would
       render at the right size in the wrong face and look entirely correct.
       Measured on the built page as well: the specimens come back
       `"Geist Sans", ui-sans-serif, system-ui` and the chrome around them
       comes back Inter. Stage 6 owns the browser check; this is the half that
       can run without one. */
    const system = typeSystem();
    const markup = renderToStaticMarkup(<TypeSpecimens system={system} />);

    /* Read out of the style attribute rather than off the raw markup. React
       writes the stack as `font-family:&quot;Geist Sans&quot;`, and the
       semicolon inside the entity ends a naive match after four characters. */
    const stacks = [...markup.matchAll(/style="([^"]+)"/g)]
      .map((match) => match[1]!.replace(/&quot;/g, '"'))
      .flatMap((style) =>
        style
          .split(";")
          .filter((declaration) => declaration.startsWith("font-family:"))
          .map((declaration) => declaration.slice("font-family:".length)),
      );
    expect(stacks.length).toBeGreaterThan(0);
    for (const stack of stacks) {
      expect(stack, "a specimen is set in the workspace's font").toContain(
        "Geist Sans",
      );
      expect(stack, "the studio's typeface reached a specimen").not.toContain(
        "Inter",
      );
      expect(stack).not.toContain("--font-sans");
    }
  });
});

describe("the typography guidance", () => {
  it("names only roles and groups a workspace actually has", () => {
    const system = typeSystem();
    const known = new Set([
      ...system.roles.map((role) => role.id),
      ...system.groups.map((group) => group.id),
    ]);

    const unknown = typographyGuidanceIds().filter((id) => !known.has(id));

    expect(unknown, unknown.join("\n")).toEqual([]);
  });

  it("names only variables the export writes", () => {
    /* A paragraph telling a developer to reference `--font-body-size` is worth
       exactly as much as that variable existing. */
    const css = formatTypeSystemCssExport(typeSystem(), "px");

    const missing = typographyGuidanceVariables().filter(
      (variable) => !css.includes(`${variable}:`),
    );

    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("has something to say about every group the system has", () => {
    const spoken = new Set(Object.keys(TYPE_GROUP_GUIDANCE));
    const silent = typeSystem()
      .groups.map((group) => group.id)
      .filter((id) => !spoken.has(id));

    expect(silent, silent.join("\n")).toEqual([]);
  });
});

/* Spacing, radius and elevation, held to the same rule as the pages above. */

const scaleProject = () => seedWorkspaceProject("Reference");
const scalePalettes = () => generatePalettes(scaleProject().palette!);

describe("the spacing page is a template over the scale", () => {
  it("moves when the base unit changes", () => {
    const base = scaleProject().spacing;
    const before = renderToStaticMarkup(<SpacingTable scale={base} />);
    const after = renderToStaticMarkup(
      <SpacingTable scale={{ ...base, baseUnitPx: 6 }} />,
    );

    /* 9px is step 1.5 at a base of 6, and the seeded scale cannot produce it:
       every value there is a multiple of 4 or a half step of it, so 9 can only
       have come from the change. 24px would not have done — step 6 at a base
       of 4 is also 24, and the assertion would have passed before the edit. */
    expect(before).toContain("16px");
    expect(before).not.toContain("9px");
    expect(after).toContain("9px");
    expect(after).not.toBe(before);
  });

  it("draws the bars from the same values", () => {
    /* The table and the specimen read one resolution. A bar wired to its own
       maths would keep drawing the old width beside a table showing the new
       one, which is the disagreement a reader would notice last. */
    const base = scaleProject().spacing;
    const before = renderToStaticMarkup(<SpacingSpecimen scale={base} />);
    const after = renderToStaticMarkup(
      <SpacingSpecimen scale={{ ...base, baseUnitPx: 6 }} />,
    );

    expect(before).toContain("width:16px");
    expect(before).not.toContain("width:9px");
    expect(after).toContain("width:9px");
  });
});

describe("the radius page is a template over the scale", () => {
  it("follows the multiplier, and leaves the two fixed tokens alone", () => {
    const base = scaleProject().radius;
    const before = renderToStaticMarkup(<RadiusTable scale={base} />);
    const after = renderToStaticMarkup(
      <RadiusTable scale={{ ...base, multiplier: 2 }} />,
    );

    expect(after).not.toBe(before);
    /* `full` is a pill in both, because half a pill is still a pill. */
    expect(before).toContain("9999px");
    expect(after).toContain("9999px");
    /* And a scaling token doubled. */
    const scaling = base.tokens.find((token) => token.scales)!;
    expect(after).toContain(`${scaling.basePx * 2}px`);
  });

  it("draws each corner at its own radius", () => {
    const base = scaleProject().radius;
    const markup = renderToStaticMarkup(<RadiusSpecimen scale={base} />);

    for (const token of base.tokens) {
      const px = token.scales
        ? Math.round(token.basePx * base.multiplier)
        : token.basePx;
      expect(markup, `${token.id} is drawn`).toContain(`border-radius:${px}px`);
    }
  });
});

describe("the elevation page is a template over the scale", () => {
  it("moves when a level's strength changes", () => {
    const base = scaleProject().elevation;
    const stronger = {
      ...base,
      levels: base.levels.map((level, index) =>
        index === 0
          ? {
              ...level,
              layers: level.layers.map((layer) => ({
                ...layer,
                opacity: { ...layer.opacity, light: 0.42 },
              })),
            }
          : level,
      ),
    };

    const before = renderToStaticMarkup(
      <ElevationTable palettes={scalePalettes()} scale={base} />,
    );
    const after = renderToStaticMarkup(
      <ElevationTable palettes={scalePalettes()} scale={stronger} />,
    );

    expect(before).not.toContain("0.42");
    expect(after).toContain("0.42");
  });

  it("draws both grounds with one shadow colour and two strengths", () => {
    /* The claim the page is making, asserted rather than described. */
    const project = scaleProject();
    const markup = renderToStaticMarkup(
      <ElevationSpecimen
        palettes={scalePalettes()}
        scale={project.elevation}
        tokens={project.semantics ?? []}
      />,
    );

    const shadows = [
      ...markup.matchAll(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/g),
    ];
    expect(shadows.length).toBeGreaterThan(0);

    const channels = new Set(
      shadows.map((match) => `${match[1]},${match[2]},${match[3]}`),
    );
    const alphas = new Set(shadows.map((match) => match[4]));
    /* One colour, more than one strength. */
    expect(channels.size).toBe(1);
    expect(alphas.size).toBeGreaterThan(1);
  });
});

describe("the scale guidance", () => {
  it("names only tokens a workspace actually has", () => {
    const project = scaleProject();
    const known = new Set([
      ...project.radius.tokens.map((token) => token.id),
      ...project.elevation.levels.map((level) => level.id),
      ...resolveSpacing(project.spacing).map((token) => token.name),
    ]);

    const unknown = scaleGuidanceIds().filter((id) => !known.has(id));

    expect(unknown, unknown.join("\n")).toEqual([]);
  });

  it("names only variables the export writes", () => {
    const project = scaleProject();
    const css = formatScaleCss({
      spacing: project.spacing,
      radius: project.radius,
      elevation: project.elevation,
      palettes: scalePalettes(),
    });

    const missing = scaleGuidanceVariables().filter(
      (variable) => !css.includes(`${variable}:`),
    );

    expect(missing, missing.join("\n")).toEqual([]);
  });
});
