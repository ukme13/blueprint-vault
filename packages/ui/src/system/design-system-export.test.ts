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
