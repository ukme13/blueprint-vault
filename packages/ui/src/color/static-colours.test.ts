import { describe, expect, it } from "vitest";
import { contrastRatio } from "./accessibility";
import {
  assessSandboxTarget,
  assignSandboxColour,
  DEFAULT_SANDBOX_COLOURS,
  resolveSandbox,
  resolveSandboxColour,
} from "./accessibility-sandbox";
import { apcaContrast } from "./apca";
import { shownLc } from "./contrast-reading";
import {
  formatPaletteCssExport,
  formatPaletteDesignTokens,
  formatPaletteTailwindExport,
} from "./export";
import { generatePalettes } from "./palette";
import { previewShadesFor } from "./preview-assessment";
import {
  resolveSemantic,
  resolveSemantics,
  seedSemanticTokens,
  type SemanticToken,
} from "./semantic";
import {
  formatSemanticCssExport,
  formatSemanticDesignTokens,
  formatSemanticTailwindExport,
} from "./semantic-export";
import {
  isStaticTrackId,
  nearestStaticColour,
  primitiveReferenceLabel,
  STATIC_BLACK,
  STATIC_COLOURS,
  STATIC_TRACK_ID,
  STATIC_WHITE,
  staticColourAt,
  staticShade,
} from "./static-colours";
import { describeReference, primitiveTrackRows } from "./token-rows";
import type { ColorTrack } from "./types";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

function palette(primary = "#7646ab"): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "primary", name: "primary", seedHex: primary },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
      { id: "success", name: "success", seedHex: "#2f7d32" },
      { id: "warning", name: "warning", seedHex: "#b87503" },
      { id: "error", name: "error", seedHex: "#b02b1b" },
      { id: "info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessValues: LIGHTNESS,
  });
}

/** A token that points at a static colour in both modes. */
function staticToken(
  id: string,
  light: { trackId: string; weight: number; alpha?: number },
  dark = light,
): SemanticToken {
  return { id, name: id, description: "", light, dark };
}

describe("the static primitives", () => {
  it("are pure white and pure black, at the two ends of the scale", () => {
    expect(
      STATIC_COLOURS.map((each) => [each.name, each.hex, each.weight]),
    ).toEqual([
      ["white", "#ffffff", 0],
      ["black", "#000000", 1000],
    ]);
    /* Past the ends of every ramp, so neither can be a shade's weight. */
    expect(
      Math.min(...LIGHTNESS.map((_, index) => index)),
    ).toBeGreaterThanOrEqual(0);
    for (const track of palette()) {
      expect(
        track.shades.every(
          (shade) => shade.weight >= 25 && shade.weight <= 950,
        ),
      ).toBe(true);
    }
    expect(STATIC_WHITE).toEqual({ trackId: STATIC_TRACK_ID, weight: 0 });
    expect(STATIC_BLACK).toEqual({ trackId: STATIC_TRACK_ID, weight: 1000 });
  });

  it("are found by weight, and by the nearer end for a weight that is neither", () => {
    expect(staticColourAt(0)?.name).toBe("white");
    expect(staticColourAt(1000)?.name).toBe("black");
    expect(staticColourAt(500)).toBeUndefined();
    expect(nearestStaticColour(300).name).toBe("white");
    expect(nearestStaticColour(700).name).toBe("black");
    expect(isStaticTrackId("static")).toBe(true);
    expect(isStaticTrackId("primary")).toBe(false);
  });

  it("are named, not numbered, wherever a reference is said", () => {
    expect(primitiveReferenceLabel("static", "static", 0)).toBe("white");
    expect(primitiveReferenceLabel("static", "static", 1000)).toBe("black");
    expect(primitiveReferenceLabel("primary", "primary-id", 500)).toBe(
      "primary/500",
    );
    expect(describeReference({ ...STATIC_WHITE, alpha: 1 })).toBe("white");
    expect(describeReference({ ...STATIC_BLACK, alpha: 0.5 })).toBe(
      "black at 50%",
    );
  });

  it("make a shade whose coordinates are the colour's own", () => {
    const white = staticShade(STATIC_COLOURS[0]!);
    const black = staticShade(STATIC_COLOURS[1]!);
    expect(white.hex).toBe("#ffffff");
    expect(white.L).toBeCloseTo(1, 2);
    expect(black.L).toBeCloseTo(0, 2);
    expect(white.isAnchor || white.isOverridden).toBe(false);
  });
});

describe("resolving a reference to a static primitive", () => {
  it("gives the colour, whatever the palette is", () => {
    const token = staticToken("fg.on-test", STATIC_WHITE, STATIC_BLACK);
    for (const tracks of [palette(), []]) {
      expect(resolveSemantic(token, "light", tracks)).toMatchObject({
        hex: "#ffffff",
        trackId: STATIC_TRACK_ID,
        trackName: "static",
        weight: 0,
        alpha: 1,
        missing: null,
      });
      expect(resolveSemantic(token, "dark", tracks)).toMatchObject({
        hex: "#000000",
        weight: 1000,
        missing: null,
      });
    }
  });

  it("keeps an alpha, and reports one out of range, as for any reference", () => {
    const half = staticToken("x", { ...STATIC_BLACK, alpha: 0.4 });
    expect(resolveSemantic(half, "light", [])).toMatchObject({
      hex: "#000000",
      alpha: 0.4,
      missing: null,
    });
    const over = staticToken("y", { ...STATIC_WHITE, alpha: 1.4 });
    expect(resolveSemantic(over, "light", [])).toMatchObject({
      alpha: 1,
      missing: "alpha",
    });
  });

  it("reports a weight that is neither end, and lands on the nearer", () => {
    const odd = staticToken("z", { trackId: STATIC_TRACK_ID, weight: 700 });
    expect(resolveSemantic(odd, "light", palette())).toMatchObject({
      hex: "#000000",
      weight: 1000,
      missing: "weight",
    });
  });

  it("still resolves the rest of a layer beside it", () => {
    const tracks = palette();
    const tokens = [
      ...seedSemanticTokens(tracks),
      staticToken("fg.test", STATIC_WHITE),
    ];
    const resolved = resolveSemantics(tokens, "light", tracks);
    expect(resolved).toHaveLength(tokens.length);
    expect(resolved.at(-1)?.hex).toBe("#ffffff");
  });

  it("is a shade the preview and its checks can read", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks).map((token) =>
      token.id === "fg.on-action"
        ? { ...token, light: { ...STATIC_WHITE }, dark: { ...STATIC_BLACK } }
        : token,
    );
    const shades = previewShadesFor(tokens, tracks, "light");
    expect(shades?.["fg.on-action"]?.hex).toBe("#ffffff");
    expect(
      previewShadesFor(tokens, tracks, "dark")?.["fg.on-action"]?.hex,
    ).toBe("#000000");
  });
});

describe("exporting a reference to a static primitive", () => {
  const tracks = palette();
  const tokens = [
    staticToken("fg.on-test", STATIC_WHITE, STATIC_BLACK),
    staticToken("fg.wash", { ...STATIC_BLACK, alpha: 0.4 }),
  ];

  it("declares white and black beside the palette, in every primitive export", () => {
    for (const format of ["hex", "oklch"] as const) {
      const css = formatPaletteCssExport(tracks, format);
      expect(css).toContain("--color-white:");
      expect(css).toContain("--color-black:");
      expect(formatPaletteTailwindExport(tracks, format)).toContain(
        "--color-white:",
      );
    }
    const hex = formatPaletteCssExport(tracks, "hex");
    expect(hex).toMatch(/--color-white: #ffffff; \/\* static \*\//i);
    expect(hex).toMatch(/--color-black: #000000; \/\* static \*\//i);
    /* After the tracks, so a project's own ramps keep their place. */
    expect(hex.indexOf("--color-info-950")).toBeLessThan(
      hex.indexOf("--color-white"),
    );
  });

  it("carries a static group in the Design Tokens palette", () => {
    const palettes = JSON.parse(
      formatPaletteDesignTokens(tracks, "hex"),
    ).palette;
    expect(palettes.static.white.$value.toLowerCase()).toBe("#ffffff");
    expect(palettes.static.black.$value.toLowerCase()).toBe("#000000");
  });

  it("aliases a role to the variable that declares it, in CSS and Tailwind", () => {
    for (const css of [
      formatSemanticCssExport(tokens, tracks),
      formatSemanticTailwindExport(tokens, tracks),
    ]) {
      expect(css).toContain("--color-fg-on-test: var(--color-white);");
      /* Dark: black, and the alpha mix wraps the alias as it does any other. */
      expect(css).toContain("--color-fg-on-test: var(--color-black);");
      expect(css).toContain(
        "--color-fg-wash: color-mix(in oklab, var(--color-black) 40%, transparent);",
      );
    }
  });

  it("aliases a role to {palette.static.white} in Design Tokens", () => {
    const semantic = JSON.parse(
      formatSemanticDesignTokens(tokens, tracks),
    ).semantic;
    expect(semantic.light.fg.on_test ?? semantic.light.fg["on-test"]).toEqual({
      $value: "{palette.static.white}",
    });
    expect(semantic.dark.fg["on-test"]).toEqual({
      $value: "{palette.static.black}",
    });
  });

  it("lists white and black as the last group of primitive rows", () => {
    const groups = primitiveTrackRows(tracks, "hex");
    const last = groups.at(-1)!;
    expect(last).toMatchObject({ id: "static", name: "static" });
    expect(last.rows.map((row) => [row.weight, row.variable, row.hex])).toEqual(
      [
        [0, "--color-white", "#ffffff"],
        [1000, "--color-black", "#000000"],
      ],
    );
    expect(groups).toHaveLength(tracks.length + 1);
  });
});

/** How a label reads on a fill: both of the lines a label is held to. */
function reads(label: string, fill: string): boolean {
  return (
    contrastRatio(label, fill) >= 4.5 &&
    shownLc(apcaContrast(label, fill)) >= 60
  );
}

const SEEDS = [
  "#7646ab",
  "#1a8917",
  "#2f7d32",
  "#00563f",
  "#e0a800",
  "#4caf50",
  "#3b82f6",
  "#ff6a00",
];

describe("seeding a label for a fill", () => {
  const ON_FILL = [
    ["action.primary", "fg.on-action"],
    ["status.success", "fg.on-success"],
    ["status.error", "fg.on-error"],
  ] as const;

  it("leaves a label on the role's own track while that track's ends read", () => {
    const tracks = palette("#7646ab");
    const tokens = seedSemanticTokens(tracks);
    const label = tokens.find((token) => token.id === "fg.on-action")!;
    expect(label.light.trackId).toBe("neutral");
    const on = resolveSemantic(label, "light", tracks)!;
    const fill = resolveSemantic(
      tokens.find((token) => token.id === "action.primary")!,
      "light",
      tracks,
    )!;
    expect(reads(on.hex, fill.hex)).toBe(true);
  });

  it("makes a label pure white when the neutral ends fall short and white reads", () => {
    /* A green whose fill white reads on and whose neutral ends do not. */
    const tracks = palette("#1a8917");
    const label = seedSemanticTokens(tracks).find(
      (token) => token.id === "fg.on-action",
    )!;
    expect(label.light).toEqual({ ...STATIC_WHITE });
    expect(resolveSemantic(label, "light", tracks)?.hex).toBe("#ffffff");
  });

  it("picks what clears both lines, and else what APCA reads best that still reaches 3:1", () => {
    for (const seed of SEEDS) {
      const tracks = palette(seed);
      const tokens = seedSemanticTokens(tracks);
      const track = (id: string) => tracks.find((each) => each.id === id)!;
      for (const mode of ["light", "dark"] as const) {
        for (const [fillId, labelId] of ON_FILL) {
          const fill = resolveSemantic(
            tokens.find((t) => t.id === fillId)!,
            mode,
            tracks,
          )!;
          const chosen = resolveSemantic(
            tokens.find((t) => t.id === labelId)!,
            mode,
            tracks,
          )!;
          const neutral = track("neutral");
          const options = [
            neutral.shades[0]!.hex,
            neutral.shades.at(-1)!.hex,
            "#ffffff",
            "#000000",
          ];
          const lc = (hex: string) => shownLc(apcaContrast(hex, fill.hex));
          const message = `${seed} ${mode} ${labelId} on ${fillId}`;
          if (options.some((hex) => reads(hex, fill.hex))) {
            /* Something clears both lines: so does what was chosen. */
            expect(reads(chosen.hex, fill.hex), message).toBe(true);
          } else {
            /* Nothing does. The one APCA reads best, among those that still
               reach 3:1; and if none reach it, the best of all. */
            const reach = options.filter(
              (hex) => contrastRatio(hex, fill.hex) >= 3,
            );
            const pool = reach.length > 0 ? reach : options;
            expect(lc(chosen.hex), message).toBe(
              Math.max(...pool.map((hex) => lc(hex))),
            );
          }
          /* Static only ever as the exact colour. */
          if (isStaticTrackId(chosen.trackId)) {
            expect(["#ffffff", "#000000"], message).toContain(chosen.hex);
          }
        }
      }
    }
  });
});

describe("the sandbox with static colours", () => {
  it("resolves White and Black as primitives, named", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);
    expect(
      resolveSandboxColour(
        { kind: "primitive", ...STATIC_WHITE },
        tokens,
        tracks,
        "light",
      ),
    ).toEqual({ hex: "#ffffff", name: "White", trackId: "static", weight: 0 });
    expect(
      resolveSandboxColour(
        { kind: "primitive", ...STATIC_BLACK },
        tokens,
        tracks,
        "dark",
      ),
    ).toMatchObject({ hex: "#000000", name: "Black", weight: 1000 });
    /* A weight that is neither end is not a colour. */
    expect(
      resolveSandboxColour(
        { kind: "primitive", trackId: "static", weight: 500 },
        tokens,
        tracks,
        "light",
      ),
    ).toBeNull();
  });

  it("scores a layer set to pure white or black at the extreme Lc", () => {
    const tracks = palette();
    const tokens = seedSemanticTokens(tracks);
    const colours = assignSandboxColour(
      assignSandboxColour(DEFAULT_SANDBOX_COLOURS, "buttonFill", {
        kind: "primitive",
        ...STATIC_BLACK,
      }),
      "buttonText",
      { kind: "primitive", ...STATIC_WHITE },
    );
    const resolved = resolveSandbox(colours, tokens, tracks, "light")!;
    const [onFill] = assessSandboxTarget(
      "wcag3",
      "buttonFill",
      resolved.hexes,
      resolved.page,
    );
    expect(onFill).toMatchObject({
      value: "Lc 108",
      grade: "Pass",
      passes: true,
    });
    expect(
      assessSandboxTarget(
        "wcag2",
        "buttonFill",
        resolved.hexes,
        resolved.page,
      )[0],
    ).toMatchObject({ value: "21.0:1", grade: "AAA" });
  });

  it("opens with button text that reaches the label line, wherever any label can", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const tracks = palette(seed);
      const tokens = seedSemanticTokens(tracks);
      const resolved = resolveSandbox(
        DEFAULT_SANDBOX_COLOURS,
        tokens,
        tracks,
        "light",
      )!;
      const fill = resolved.hexes.buttonFill;
      /* A fill in the middle of the lightness range gives no label, white
         included, both lines at once: that is a fact about the fill, and it is
         left to the seed's fallback. Where a label can reach Lc 60 and 4.5:1,
         the sandbox's button text does. */
      const attainable = ["#ffffff", "#000000"].some((hex) => reads(hex, fill));
      if (!attainable) continue;
      checked += 1;

      const [onFill] = assessSandboxTarget(
        "wcag3",
        "buttonFill",
        resolved.hexes,
        resolved.page,
      );
      expect(onFill?.passes, `${seed}: ${onFill?.value}`).toBe(true);
      expect(
        Math.abs(apcaContrast(resolved.hexes.buttonText, fill)),
      ).toBeGreaterThanOrEqual(59.5);
    }
    /* Not an empty loop: most of the brand colours here are such fills. */
    expect(checked).toBeGreaterThanOrEqual(4);
  });
});
