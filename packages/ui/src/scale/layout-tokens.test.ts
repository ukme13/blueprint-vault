import { describe, expect, it } from "vitest";
import { defaultPreviewDevices } from "../typography/preview-devices";
import {
  defaultLayoutTokens,
  formatLayoutCss,
  layoutCssVariablesForDevice,
  normalizeLayoutTokens,
  pruneLayoutDevices,
} from "./layout-tokens";
import {
  addLayoutToken,
  duplicateLayoutToken,
  hybridValueFromLayoutCell,
  layoutCellFromHybrid,
  removeLayoutToken,
  renameLayoutToken,
  reorderLayoutTokens,
  setLayoutReference,
} from "./layout-edit";

const extra = {
  id: "desktop-extra-1",
  kind: "desktop" as const,
  name: "Desktop 2",
  widthPx: 1440,
  ratio: 1.25,
};

describe("layout tokens", () => {
  it("seeds six uses against the required frames", () => {
    const tokens = defaultLayoutTokens();
    expect(tokens.map((token) => token.id)).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
    ]);
    expect(tokens[0]?.byDevice).toEqual({
      phone: "4",
      tablet: "6",
      desktop: "10",
    });
    expect(tokens[2]?.byDevice.desktop).toBe("page");
  });

  it("seeds when the stored value is missing, and heals an empty list", () => {
    expect(
      normalizeLayoutTokens(undefined, defaultPreviewDevices()).map(
        (token) => token.id,
      ),
    ).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
    ]);
    /* Every system use is back: the preview paints with them. */
    expect(
      normalizeLayoutTokens([], defaultPreviewDevices()).map(
        (token) => token.id,
      ),
    ).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
    ]);
  });

  it("keeps custom rows in stored order", () => {
    const stored = [
      ...defaultLayoutTokens(),
      {
        id: "inset-hero",
        name: "Hero inset",
        description: "",
        kind: "spacing" as const,
        byDevice: { phone: "8", tablet: "10", desktop: "16" },
      },
      {
        id: "gap-grid",
        name: "Grid gap",
        description: "",
        kind: "spacing" as const,
        byDevice: { phone: "4", tablet: "4", desktop: "6" },
      },
    ];
    expect(
      normalizeLayoutTokens(stored, defaultPreviewDevices()).map(
        (token) => token.id,
      ),
    ).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
      "inset-hero",
      "gap-grid",
    ]);
  });

  it("keeps a typed px on a cell", () => {
    const stored = [
      {
        id: "inset-hero",
        name: "Hero inset",
        kind: "spacing",
        byDevice: { phone: "8", tablet: "16px", desktop: "10" },
      },
    ];
    const tokens = normalizeLayoutTokens(stored, defaultPreviewDevices());
    const hero = tokens.find((token) => token.id === "inset-hero");
    expect(hero?.byDevice.phone).toBe("8");
    expect(hero?.byDevice.tablet).toBe("16px");
    expect(hero?.byDevice.desktop).toBe("10");
  });

  it("fills a new extra desktop from the previous frame", () => {
    const devices = [...defaultPreviewDevices(), extra];
    const tokens = normalizeLayoutTokens(defaultLayoutTokens(), devices);
    expect(tokens[0]?.byDevice["desktop-extra-1"]).toBe("10");
    expect(tokens[2]?.byDevice["desktop-extra-1"]).toBe("page");
  });

  it("drops cells for a frame that is gone", () => {
    const devices = [...defaultPreviewDevices(), extra];
    const filled = normalizeLayoutTokens(undefined, devices);
    const pruned = pruneLayoutDevices(
      filled,
      defaultPreviewDevices().map((device) => device.id),
    );
    expect(pruned[0]?.byDevice).not.toHaveProperty("desktop-extra-1");
  });

  it("repoints one cell without touching the others", () => {
    const next = setLayoutReference(
      defaultLayoutTokens(),
      "gap-section",
      "phone",
      "8",
    );
    expect(next[1]?.byDevice.phone).toBe("8");
    expect(next[1]?.byDevice.desktop).toBe("16");
    expect(next[0]?.byDevice.phone).toBe("4");
  });

  it("exports aliases rewritten at each preview width", () => {
    const css = formatLayoutCss(defaultLayoutTokens(), defaultPreviewDevices());
    expect(css).toContain("--inset-container: var(--spacing-4);");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain("--gap-section: var(--spacing-16);");
    expect(css).toContain("--radius-surface: var(--radius-page);");
    expect(css).toContain("@media (min-width: 1120px)");
  });

  it("can name a host other than :root without dropping the tokens", () => {
    const css = formatLayoutCss(
      defaultLayoutTokens(),
      defaultPreviewDevices(),
      ".preview-site",
    );
    expect(css).toContain(".preview-site {");
    expect(css).not.toContain(":root {");
    expect(css).toContain("--inset-container: var(--spacing-4);");
  });

  it("resolves one frame as custom properties so a canvas can pick the width", () => {
    const vars = layoutCssVariablesForDevice(defaultLayoutTokens(), "phone");
    expect(vars["--inset-container"]).toBe("var(--spacing-4)");
    expect(vars["--gap-section"]).toBe("var(--spacing-16)");
    expect(vars["--radius-surface"]).toBe("var(--radius-container)");
  });

  it("lifts the old phone and tablet section gaps that shrank the landing", () => {
    const stored = [
      {
        id: "inset-container",
        name: "Container inset",
        kind: "spacing",
        byDevice: { phone: "4", tablet: "6", desktop: "10" },
      },
      {
        id: "gap-section",
        name: "Section gap",
        kind: "spacing",
        byDevice: { phone: "6", tablet: "10", desktop: "16" },
      },
    ];
    const tokens = normalizeLayoutTokens(stored, defaultPreviewDevices());
    expect(tokens[1]?.byDevice).toEqual({
      phone: "16",
      tablet: "16",
      desktop: "16",
    });
    expect(tokens[0]?.byDevice.phone).toBe("4");
  });

  it("leaves a section gap someone chose on the phone", () => {
    const stored = [
      {
        id: "gap-section",
        name: "Section gap",
        kind: "spacing",
        byDevice: { phone: "6", tablet: "8", desktop: "16" },
      },
    ];
    const tokens = normalizeLayoutTokens(stored, defaultPreviewDevices());
    const gap = tokens.find((token) => token.id === "gap-section");
    expect(gap?.byDevice.phone).toBe("6");
    expect(gap?.byDevice.tablet).toBe("8");
  });

  it("adds a use of this kind after the others, copying the last pointers", () => {
    const next = addLayoutToken(
      defaultLayoutTokens(),
      "spacing",
      defaultPreviewDevices(),
      "Hero inset",
    );
    expect(next.map((token) => token.id)).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
      "hero-inset",
    ]);
    expect(next.at(-1)?.kind).toBe("spacing");
    expect(next.at(-1)?.byDevice).toEqual(next[1]?.byDevice);
  });

  it("renames the use and the variable together", () => {
    const withHero = addLayoutToken(
      defaultLayoutTokens(),
      "spacing",
      defaultPreviewDevices(),
      "Hero inset",
    );
    const next = renameLayoutToken(withHero, "hero-inset", "Grid gap");
    expect(next.at(-1)?.id).toBe("grid-gap");
    expect(next.at(-1)?.name).toBe("Grid gap");
    expect(next.map((token) => token.id)).not.toContain("hero-inset");
  });

  it("duplicates a use directly under its source", () => {
    const withHero = addLayoutToken(
      defaultLayoutTokens(),
      "spacing",
      defaultPreviewDevices(),
      "Hero inset",
    );
    const next = duplicateLayoutToken(withHero, "hero-inset");
    expect(next.slice(-2).map((token) => token.id)).toEqual([
      "hero-inset",
      "hero-inset-copy",
    ]);
    expect(next.at(-1)?.name).toBe("Hero inset copy");
    expect(next.at(-1)?.byDevice).toEqual(next.at(-2)?.byDevice);
    /* A second copy numbers itself rather than colliding. */
    expect(duplicateLayoutToken(next, "hero-inset").at(-2)?.name).toBe(
      "Hero inset copy 2",
    );
  });

  it("deletes a custom use", () => {
    const withHero = addLayoutToken(
      defaultLayoutTokens(),
      "spacing",
      defaultPreviewDevices(),
      "Hero inset",
    );
    expect(
      removeLayoutToken(withHero, "hero-inset").map((token) => token.id),
    ).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
    ]);
  });

  it("reorders two uses of the same kind and refuses a cross-kind drop", () => {
    const moved = reorderLayoutTokens(
      defaultLayoutTokens(),
      "gap-section",
      "inset-container",
    );
    expect(moved.map((token) => token.id)).toEqual([
      "gap-section",
      "inset-container",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
    ]);
    expect(
      reorderLayoutTokens(
        defaultLayoutTokens(),
        "gap-section",
        "radius-surface",
      ).map((token) => token.id),
    ).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
    ]);
  });

  it("writes a typed px and exports it as a length, not an alias", () => {
    const next = setLayoutReference(
      defaultLayoutTokens(),
      "gap-section",
      "phone",
      "16px",
    );
    expect(next[1]?.byDevice.phone).toBe("16px");
    expect(formatLayoutCss(next, defaultPreviewDevices())).toContain(
      "--gap-section: 16px;",
    );
  });

  it("turns a hybrid bind and a typed size back into a cell", () => {
    const presets = [
      { id: "4", name: "4", value: 16 },
      { id: "6", name: "6", value: 24 },
    ];
    expect(hybridValueFromLayoutCell("spacing", "4", presets)).toEqual({
      isPreset: true,
      presetId: "4",
      value: 16,
    });
    expect(hybridValueFromLayoutCell("spacing", "20px", presets)).toEqual({
      isPreset: false,
      value: 20,
    });
    expect(
      layoutCellFromHybrid({ isPreset: true, presetId: "6", value: 24 }),
    ).toBe("6");
    expect(layoutCellFromHybrid({ isPreset: false, value: 20 })).toBe("20px");
  });
});
