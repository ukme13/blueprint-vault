import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import type { ColorTrack } from "../color/types";
import { defaultElevationScale } from "./elevation";
import { defaultRadiusScale } from "./radius";
import {
  formatScaleCss,
  formatScaleTailwind,
  scaleDesignTokenGroups,
  type ScaleExportInput,
} from "./scale-export";
import { defaultSpacingScale } from "./spacing";

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [{ id: "neutral", name: "neutral", seedHex: "#737373" }],
    lightnessValues: [97.5, 80, 60, 40, 20, 5],
  });
}

function input(): ScaleExportInput {
  return {
    spacing: defaultSpacingScale(),
    radius: defaultRadiusScale(),
    elevation: defaultElevationScale(),
    palettes: palette(),
  };
}

describe("the CSS export", () => {
  it("uses rem for spacing and px for radius", () => {
    /* Spacing should grow when somebody raises their browser font size; a 4px
       corner should not. */
    const css = formatScaleCss(input());
    expect(css).toContain("--spacing-4: 1rem;");
    expect(css).toContain("--radius-element: 8px;");
  });

  it("writes spacing and radius once, and elevation in every block", () => {
    /* Repeating spacing in a dark block would say it might change with the
       mode. Elevation's strength does. */
    const css = formatScaleCss(input());
    expect(css.match(/--spacing-4:/g)).toHaveLength(1);
    expect(css.match(/--radius-element:/g)).toHaveLength(1);
    expect(css.match(/--shadow-low:/g)).toHaveLength(3);
  });

  it("lets an explicit theme beat the system setting", () => {
    const css = formatScaleCss(input());
    expect(css).toContain(':root:not([data-theme="light"])');
    expect(css.lastIndexOf(':root[data-theme="dark"]')).toBeGreaterThan(
      css.indexOf("@media (prefers-color-scheme: dark)"),
    );
  });

  it("casts a stronger shadow in the dark block", () => {
    const css = formatScaleCss(input());
    const alphaOf = (block: string) =>
      Number(/--shadow-low:[^;]*?,\s*([\d.]+)\)/.exec(block)?.[1]);
    const [light, dark] = css.split("@media (prefers-color-scheme: dark)");
    expect(alphaOf(dark!)).toBeGreaterThan(alphaOf(light!));
  });
});

describe("the Tailwind export", () => {
  it("puts the utilities in @theme and the mode overrides outside it", () => {
    /* @theme is what generates p-4 and rounded-element; it declares tokens,
       not the rules that change them per mode. */
    const css = formatScaleTailwind(input());
    const theme = css.slice(css.indexOf("@theme static {"), css.indexOf("\n}"));
    expect(theme).toContain("--spacing-4:");
    expect(theme).toContain("--radius-element:");
    expect(theme).not.toContain("data-theme");
    expect(css).toContain(':root[data-theme="dark"]');
  });
});

describe("the design tokens export", () => {
  it("gives a shadow a structured value, not a CSS string", () => {
    /* A tool reading this has to be able to change one offset without parsing
       a sentence. */
    const groups = scaleDesignTokenGroups(input()) as {
      shadow: {
        $type: string;
        light: Record<string, { $value: Array<Record<string, string>> }>;
      };
    };

    expect(groups.shadow.$type).toBe("shadow");
    const low = groups.shadow.light.low!.$value;
    expect(Array.isArray(low)).toBe(true);
    expect(low).toHaveLength(2);
    expect(Object.keys(low[0]!).sort()).toEqual([
      "blur",
      "color",
      "offsetX",
      "offsetY",
      "spread",
    ]);
  });

  it("writes the shadow colour as hex with alpha", () => {
    const groups = scaleDesignTokenGroups(input()) as {
      shadow: { light: Record<string, { $value: Array<{ color: string }> }> };
    };
    expect(groups.shadow.light.low!.$value[0]!.color).toMatch(
      /^#[0-9a-f]{8}$/i,
    );
  });

  it("keeps the same colour and a different alpha across modes", () => {
    const groups = scaleDesignTokenGroups(input()) as {
      shadow: Record<
        string,
        Record<string, { $value: Array<{ color: string }> }>
      >;
    };
    const light = groups.shadow.light!.low!.$value[0]!.color;
    const dark = groups.shadow.dark!.low!.$value[0]!.color;

    expect(dark.slice(0, 7)).toBe(light.slice(0, 7));
    expect(dark.slice(7)).not.toBe(light.slice(7));
  });

  it("types spacing and radius as dimensions", () => {
    const groups = scaleDesignTokenGroups(input()) as {
      spacing: { $type: string; "4": { $value: string } };
      radius: { $type: string; element: { $value: string } };
    };
    expect(groups.spacing.$type).toBe("dimension");
    expect(groups.spacing["4"]!.$value).toBe("1rem");
    expect(groups.radius.$type).toBe("dimension");
    expect(groups.radius.element.$value).toBe("8px");
  });
});
