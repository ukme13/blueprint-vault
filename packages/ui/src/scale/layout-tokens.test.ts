import { describe, expect, it } from "vitest";
import { defaultPreviewDevices } from "../typography/preview-devices";
import {
  defaultLayoutTokens,
  formatLayoutCss,
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
  it("seeds three uses against the required frames", () => {
    const tokens = defaultLayoutTokens();
    expect(tokens.map((token) => token.id)).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
    ]);
    expect(tokens[0]?.byDevice).toEqual({
      phone: "4",
      tablet: "6",
      desktop: "10",
    });
    expect(tokens[2]?.byDevice.desktop).toBe("page");
  });

  it("seeds when the stored value is missing, and keeps an empty author list empty", () => {
    expect(
      normalizeLayoutTokens(undefined, defaultPreviewDevices()).map(
        (token) => token.id,
      ),
    ).toEqual(["inset-container", "gap-section", "radius-surface"]);
    expect(normalizeLayoutTokens([], defaultPreviewDevices())).toEqual([]);
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
    expect(tokens[0]?.byDevice.phone).toBe("8");
    expect(tokens[0]?.byDevice.tablet).toBe("16px");
    expect(tokens[0]?.byDevice.desktop).toBe("10");
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
    expect(css).toContain("--gap-section: var(--spacing-10);");
    expect(css).toContain("--radius-surface: var(--radius-page);");
    expect(css).toContain("@media (min-width: 1120px)");
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
      "hero-inset",
    ]);
    expect(next[3]?.kind).toBe("spacing");
    expect(next[3]?.byDevice).toEqual(next[1]?.byDevice);
  });

  it("renames the use and the variable together", () => {
    const next = renameLayoutToken(
      defaultLayoutTokens(),
      "gap-section",
      "Grid gap",
    );
    expect(next[1]?.id).toBe("grid-gap");
    expect(next[1]?.name).toBe("Grid gap");
    expect(next.map((token) => token.id)).not.toContain("gap-section");
  });

  it("duplicates a use directly under its source", () => {
    const next = duplicateLayoutToken(defaultLayoutTokens(), "inset-container");
    expect(next.map((token) => token.id)).toEqual([
      "inset-container",
      "inset-container-copy",
      "gap-section",
      "radius-surface",
    ]);
    expect(next[1]?.name).toBe("Container inset copy");
    expect(next[1]?.byDevice).toEqual(next[0]?.byDevice);
  });

  it("deletes a use, including a seed", () => {
    const next = removeLayoutToken(defaultLayoutTokens(), "gap-section");
    expect(next.map((token) => token.id)).toEqual([
      "inset-container",
      "radius-surface",
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
    ]);
    expect(
      reorderLayoutTokens(
        defaultLayoutTokens(),
        "gap-section",
        "radius-surface",
      ).map((token) => token.id),
    ).toEqual(["inset-container", "gap-section", "radius-surface"]);
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
