import { describe, expect, it } from "vitest";
import { generatePalettes } from "../color/palette";
import { seedWorkspaceProject } from "../workspace/seed-project";
import {
  formatDesignSystemCss,
  formatDesignSystemDesignTokens,
  formatDesignSystemTailwind,
  type DesignSystemExportInput,
} from "./design-system-export";

/*
 * One file, the whole system. The export dialog offers each of these three
 * formats from every studio, so a file that leaves out the uses or the type
 * scale is a client with half a system and no sign of which half.
 */

function input(
  typography: "with" | "without" = "with",
): DesignSystemExportInput {
  const project = seedWorkspaceProject("Client");
  return {
    palettes: project.palette ? generatePalettes(project.palette) : [],
    semantics: project.semantics ?? [],
    spacing: project.spacing,
    radius: project.radius,
    elevation: project.elevation,
    motion: project.motion,
    colourFormat: "hex",
    layout: project.layout,
    previewDevices: project.previewDevices,
    typography:
      typography === "with" && project.typography
        ? {
            system: project.typography.system,
            unit: "rem",
            remRootPx: project.typography.remRootPx,
          }
        : null,
  };
}

describe("the design system export", () => {
  it("writes the uses and the type scale into the CSS", () => {
    const css = formatDesignSystemCss(input());
    expect(css).toContain("--inset-card:");
    expect(css).toContain("--radius-button:");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toMatch(/--font-[a-z0-9-]+-size:/);
  });

  it("writes the uses and the type scale into the Tailwind theme", () => {
    const tailwind = formatDesignSystemTailwind(input());
    expect(tailwind).toContain("--inset-card:");
    expect(tailwind).toContain("--radius-button:");
    expect(tailwind).toMatch(/--font-[a-z0-9-]+-size:/);
  });

  it("writes the uses and the type scale into the tokens", () => {
    const tokens = JSON.parse(formatDesignSystemDesignTokens(input()));
    expect(tokens.layout.phone["inset-card"].$value).toMatch(/^\{spacing\./);
    expect(tokens.layout.phone["radius-button"].$value).toMatch(/^\{radius\./);
    expect(Object.keys(tokens.typography)).toEqual(
      expect.arrayContaining(["fontFamily", "fontWeight", "phone", "desktop"]),
    );
  });

  it("leaves typography out when there is none", () => {
    const css = formatDesignSystemCss(input("without"));
    const tailwind = formatDesignSystemTailwind(input("without"));
    const tokens = JSON.parse(formatDesignSystemDesignTokens(input("without")));

    expect(css).not.toMatch(/--font-[a-z0-9-]+-size:/);
    expect(tailwind).not.toMatch(/--font-[a-z0-9-]+-size:/);
    expect(tokens.typography).toBeUndefined();
    // The uses do not depend on it.
    expect(css).toContain("--inset-card:");
  });

  it("follows the chosen type unit", () => {
    const rem = formatDesignSystemCss(input());
    const px = formatDesignSystemCss({
      ...input(),
      typography: { ...input().typography!, unit: "px" },
    });
    const size = (css: string) =>
      css.match(/--font-[a-z0-9-]+-size: ([^;]+);/)![1];

    expect(size(rem)).toContain("rem");
    expect(size(px)).not.toContain("rem");
    expect(size(px)).toContain("px");
  });
});

describe("motion in the design system export", () => {
  it("writes the durations and the curves into the CSS, once", () => {
    const css = formatDesignSystemCss(input());
    expect(css).toContain("--duration-fast: 150ms;");
    expect(css).toContain("--ease-standard: cubic-bezier(0.2, 0, 0, 1);");
    expect(css.match(/--duration-fast:/g)).toHaveLength(1);
  });

  it("writes them into the Tailwind theme, with a utility for each duration", () => {
    const tailwind = formatDesignSystemTailwind(input());
    expect(tailwind).toContain("--duration-fast: 150ms;");
    expect(tailwind).toContain(
      "--ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1);",
    );
    expect(tailwind).toContain("@utility duration-fast {");
  });

  it("writes them into the tokens, beside the other families", () => {
    const tokens = JSON.parse(formatDesignSystemDesignTokens(input()));
    expect(tokens.motion.duration.fast.$value).toBe("150ms");
    expect(tokens.motion.easing.standard.$value).toEqual([0.2, 0, 0, 1]);
    expect(Object.keys(tokens)).toEqual(
      expect.arrayContaining([
        "palette",
        "spacing",
        "radius",
        "shadow",
        "motion",
      ]),
    );
  });

  it("writes a preset's own scale, not the default", () => {
    const own = {
      ...input(),
      motion: {
        durations: [{ id: "snap", name: "Snap", ms: 70 }],
        easings: [],
      },
    };
    const css = formatDesignSystemCss(own);
    expect(css).toContain("--duration-snap: 70ms;");
    expect(css).not.toContain("--duration-fast:");
    expect(css).not.toContain("--ease-");
  });

  it("leaves motion out when the caller has none, as it always did", () => {
    const { motion, ...without } = input();
    void motion;
    expect(formatDesignSystemCss(without)).not.toContain("--duration-");
    expect(formatDesignSystemTailwind(without)).not.toContain(
      "@utility duration-",
    );
    expect(
      JSON.parse(formatDesignSystemDesignTokens(without)).motion,
    ).toBeUndefined();
  });
});
