import { describe, expect, it } from "vitest";
import { formatPaletteCssExport, formatPaletteDesignTokens } from "./export";
import { generatePalettes } from "./palette";
import { seedSemanticTokens, type SemanticToken } from "./semantic";
import {
  formatSemanticCssExport,
  formatSemanticDesignTokens,
  formatSemanticTailwindExport,
} from "./semantic-export";
import type { ColorTrack } from "./types";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "t-neutral", name: "neutral", seedHex: "#737373" },
      { id: "t-success", name: "success", seedHex: "#2f7d32" },
      { id: "t-warning", name: "warning", seedHex: "#b87503" },
      { id: "t-error", name: "error", seedHex: "#b02b1b" },
      { id: "t-info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessValues: LIGHTNESS,
  });
}

describe("the CSS export", () => {
  it("emits aliases, never resolved colours", () => {
    /* The rule the layer exists for. A client who edits one primitive should
       see every semantic move; a file of flattened hex values is a second
       palette that drifts from the first the moment either is touched. */
    const css = formatSemanticCssExport(
      seedSemanticTokens(palette()),
      palette(),
    );

    expect(css).toContain("--color-action-primary: var(--color-primary-");
    expect(css).not.toMatch(/--color-action-primary: #/);
    expect(css).not.toMatch(/oklch\(/);
  });

  it("names variables the primitive export actually defines", () => {
    /* An alias to a variable nothing declares is dropped silently and the
       element keeps whatever it inherited — the same class of bug the css
       token check was built for. */
    const tracks = palette();
    const primitives = formatPaletteCssExport(tracks, "hex");
    const declared = new Set(
      [...primitives.matchAll(/(--color-[a-z0-9-]+):/g)].map(
        (match) => match[1]!,
      ),
    );

    const referenced = [
      ...formatSemanticCssExport(seedSemanticTokens(tracks), tracks).matchAll(
        /var\((--color-[a-z0-9-]+)\)/g,
      ),
    ].map((match) => match[1]!);

    expect(referenced.length).toBeGreaterThan(0);
    expect(referenced.filter((name) => !declared.has(name))).toEqual([]);
  });

  it("carries both modes, and lets a choice beat the system setting", () => {
    const tracks = palette();
    const css = formatSemanticCssExport(seedSemanticTokens(tracks), tracks);

    expect(css).toContain(":root {");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain(':root:not([data-theme="light"])');
    expect(css).toContain(':root[data-theme="dark"]');
    /* The explicit choice comes last, or the media query wins over it. */
    expect(css.lastIndexOf(':root[data-theme="dark"]')).toBeGreaterThan(
      css.indexOf("@media (prefers-color-scheme: dark)"),
    );
  });

  it("gives the two modes different values", () => {
    const tracks = palette();
    const css = formatSemanticCssExport(seedSemanticTokens(tracks), tracks);
    const [light, dark] = css.split("@media (prefers-color-scheme: dark)");

    const surface = (block: string) =>
      /--color-surface-base: var\((--color-[a-z0-9-]+)\)/.exec(block)?.[1];

    expect(surface(light!)).toBeDefined();
    expect(surface(dark!)).toBeDefined();
    expect(surface(dark!)).not.toBe(surface(light!));
  });
});

describe("the Tailwind export", () => {
  it("puts light in @theme and dark beside it", () => {
    const tracks = palette();
    const css = formatSemanticTailwindExport(
      seedSemanticTokens(tracks),
      tracks,
    );

    expect(css).toContain("@theme {");
    expect(css).toContain(':root[data-theme="dark"]');
    /* @theme declares tokens, not the rules that override them, so dark cannot
       live inside it. */
    const theme = css.slice(css.indexOf("@theme {"), css.indexOf("}"));
    expect(theme).not.toContain("data-theme");
  });
});

describe("the design tokens export", () => {
  it("aliases the groups the palette export writes", () => {
    const tracks = palette();
    const primitives = JSON.parse(formatPaletteDesignTokens(tracks, "hex")) as {
      palette: Record<string, Record<string, unknown>>;
    };
    const semantic = JSON.parse(
      formatSemanticDesignTokens(seedSemanticTokens(tracks), tracks),
    ) as {
      semantic: {
        light: Record<string, Record<string, { $value: string }>>;
      };
    };

    const alias = semantic.semantic.light.action!.primary!.$value;
    expect(alias).toMatch(/^\{palette\.[a-z-]+\.\d+\}$/);

    /* Follow the alias into the other file. A reference nobody can resolve is
       worse than a value, because it looks correct. */
    const [, track, weight] = /^\{palette\.([a-z-]+)\.(\d+)\}$/.exec(alias)!;
    expect(primitives.palette[track!]).toBeDefined();
    expect(primitives.palette[track!]![weight!]).toBeDefined();
  });

  it("nests a dotted id into groups", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);
    const output = JSON.parse(formatSemanticDesignTokens(tokens, tracks)) as {
      semantic: {
        light: Record<string, unknown>;
        dark: Record<string, unknown>;
      };
    };

    expect(Object.keys(output.semantic.light).sort()).toEqual([
      "action",
      "border",
      "fg",
      "focus",
      "status",
      "surface",
    ]);
    expect(Object.keys(output.semantic.dark)).toHaveLength(6);
  });

  it("keeps a token when another id is a prefix of it", () => {
    /* `text` and `text.primary` can both exist: the editor keeps ids unique,
       not free of prefixes. Nesting the second under the first would overwrite
       a token with a group. */
    const tracks = palette();
    const tokens: SemanticToken[] = [
      {
        id: "text",
        name: "Text",
        description: "",
        light: { trackId: "t-neutral", weight: 950 },
        dark: { trackId: "t-neutral", weight: 25 },
      },
      {
        id: "fg.primary",
        name: "Text primary",
        description: "",
        light: { trackId: "t-neutral", weight: 900 },
        dark: { trackId: "t-neutral", weight: 50 },
      },
    ];

    const output = JSON.parse(formatSemanticDesignTokens(tokens, tracks)) as {
      semantic: { light: { text: { $value?: string } } };
    };
    expect(output.semantic.light.text.$value).toBe("{palette.neutral.950}");
  });

  it("emits an empty layer without failing", () => {
    const output = JSON.parse(formatSemanticDesignTokens([], palette())) as {
      semantic: { light: Record<string, unknown> };
    };
    expect(output.semantic.light).toEqual({});
    expect(formatSemanticCssExport([], palette())).toContain(":root {");
  });
});
