import { describe, expect, it } from "vitest";
import { defaultPreviewDevices } from "../typography/preview-devices";
import {
  defaultLayoutTokens,
  formatLayoutCss,
  isLayoutCellValue,
  layoutCssVariablesForDevice,
  normalizeLayoutTokens,
  pruneLayoutDevices,
  rebindPrunedSpacingTokens,
  toggleSpacingStepWithLayout,
  tokensUsingSpacingStep,
  type LayoutToken,
} from "./layout-tokens";
import { defaultSpacingScale } from "./spacing";
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
  it("seeds eleven uses against the required frames", () => {
    const tokens = defaultLayoutTokens();
    expect(tokens.map((token) => token.id)).toEqual([
      "inset-container",
      "gap-section",
      "inset-control-x",
      "inset-control-y",
      "gap-grid",
      "gap-nav",
      "inset-card",
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
    expect(
      tokens.find((token) => token.id === "radius-surface")?.byDevice.desktop,
    ).toBe("page");
  });

  it("seeds a control's two insets, the half step by its variable's name", () => {
    const byDevice = (id: string) =>
      defaultLayoutTokens().find((token) => token.id === id)?.byDevice;
    expect(byDevice("inset-control-x")).toEqual({
      phone: "3",
      tablet: "4",
      desktop: "4",
    });
    expect(byDevice("inset-control-y")).toEqual({
      phone: "1-5",
      tablet: "2",
      desktop: "2",
    });
    /* "1.5" is not a cell; "1-5" is, and exports as --spacing-1-5. */
    expect(isLayoutCellValue("spacing", "1.5")).toBe(false);
    expect(isLayoutCellValue("spacing", "1-5")).toBe(true);
    expect(
      formatLayoutCss(defaultLayoutTokens(), defaultPreviewDevices()),
    ).toContain("--inset-control-y: var(--spacing-1-5);");
  });

  it("seeds the grid, nav and card uses the preview landing reads", () => {
    const byDevice = (id: string) =>
      defaultLayoutTokens().find((token) => token.id === id)?.byDevice;
    expect(byDevice("gap-grid")).toEqual({
      phone: "4",
      tablet: "6",
      desktop: "8",
    });
    expect(byDevice("gap-nav")).toEqual({
      phone: "3",
      tablet: "4",
      desktop: "6",
    });
    expect(byDevice("inset-card")).toEqual({
      phone: "4",
      tablet: "5",
      desktop: "6",
    });
    /* A workspace saved before them gains all three when read. */
    const older = defaultLayoutTokens().filter(
      (token) => !["gap-grid", "gap-nav", "inset-card"].includes(token.id),
    );
    expect(
      normalizeLayoutTokens(older, defaultPreviewDevices()).map(
        (token) => token.id,
      ),
    ).toEqual(expect.arrayContaining(["gap-grid", "gap-nav", "inset-card"]));
  });

  it("seeds when the stored value is missing, and heals an empty list", () => {
    expect(
      normalizeLayoutTokens(undefined, defaultPreviewDevices()).map(
        (token) => token.id,
      ),
    ).toEqual([
      "inset-container",
      "gap-section",
      "inset-control-x",
      "inset-control-y",
      "gap-grid",
      "gap-nav",
      "inset-card",
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
      "inset-control-x",
      "inset-control-y",
      "gap-grid",
      "gap-nav",
      "inset-card",
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
        id: "gap-hero",
        name: "Hero gap",
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
      "inset-control-x",
      "inset-control-y",
      "gap-grid",
      "gap-nav",
      "inset-card",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
      "inset-hero",
      "gap-hero",
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
    expect(
      tokens.find((token) => token.id === "radius-surface")?.byDevice[
        "desktop-extra-1"
      ],
    ).toBe("page");
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
      "inset-control-x",
      "inset-control-y",
      "gap-grid",
      "gap-nav",
      "inset-card",
      "radius-surface",
      "radius-button",
      "radius-input",
      "radius-chip",
      "hero-inset",
    ]);
    expect(next.at(-1)?.kind).toBe("spacing");
    /* The last spacing use before it is Card inset. */
    expect(next.at(-1)?.byDevice).toEqual(
      next.find((token) => token.id === "inset-card")?.byDevice,
    );
  });

  it("renames the use and the variable together", () => {
    const withHero = addLayoutToken(
      defaultLayoutTokens(),
      "spacing",
      defaultPreviewDevices(),
      "Hero inset",
    );
    const next = renameLayoutToken(withHero, "hero-inset", "Hero gap");
    expect(next.at(-1)?.id).toBe("hero-gap");
    expect(next.at(-1)?.name).toBe("Hero gap");
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
      "inset-control-x",
      "inset-control-y",
      "gap-grid",
      "gap-nav",
      "inset-card",
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
      "inset-control-x",
      "inset-control-y",
      "gap-grid",
      "gap-nav",
      "inset-card",
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
      "inset-control-x",
      "inset-control-y",
      "gap-grid",
      "gap-nav",
      "inset-card",
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

describe("tokensUsingSpacingStep", () => {
  const uses = defaultLayoutTokens();
  const names = (step: number) =>
    tokensUsingSpacingStep(uses, step).map((token) => token.id);

  it("finds the uses that point at a step on any frame", () => {
    /* Step 4 is Container inset, Grid gap and Card inset on a phone,
       Navigation gap on a tablet, and Control inline inset on a tablet and a
       desktop; 10 is Container inset on a desktop. */
    expect(names(4)).toEqual([
      "inset-container",
      "inset-control-x",
      "gap-grid",
      "gap-nav",
      "inset-card",
    ]);
    expect(names(10)).toEqual(["inset-container"]);
    expect(names(16)).toEqual(["gap-section"]);
  });

  it("finds none for a step no use points at", () => {
    expect(names(7)).toEqual([]);
  });

  it("matches a half step by its name, not its number", () => {
    const hairline = {
      ...uses[0]!,
      id: "gap-hairline",
      byDevice: { phone: "0-5" },
    };
    expect(
      tokensUsingSpacingStep([hairline], 0.5).map((token) => token.id),
    ).toEqual(["gap-hairline"]);
  });

  it("ignores radius uses and typed pixel values", () => {
    const typed = { ...uses[0]!, id: "typed", byDevice: { phone: "16px" } };
    // A radius use, even one whose value reads like a step name.
    const radius = {
      ...typed,
      id: "radius-odd",
      kind: "radius" as const,
      byDevice: { phone: "16" },
    };
    expect(tokensUsingSpacingStep([typed, radius], 16)).toEqual([]);
  });
});

describe("rebindPrunedSpacingTokens", () => {
  const use = (id: string, byDevice: Record<string, string>): LayoutToken => ({
    id,
    name: id,
    description: "",
    kind: "spacing",
    byDevice,
  });

  it("moves a use off the pruned step, on every frame, to the nearest kept", () => {
    const layout = [
      use("inset-container", { desktop: "4", tablet: "4", mobile: "2" }),
    ];
    const next = rebindPrunedSpacingTokens(layout, 4, [0, 1, 2, 5, 8]);
    expect(next[0]!.byDevice).toEqual({
      desktop: "5",
      tablet: "5",
      mobile: "2",
    });
  });

  it("takes the smaller step on a tie", () => {
    const next = rebindPrunedSpacingTokens(
      [use("gap", { desktop: "4" })],
      4,
      [3, 5],
    );
    expect(next[0]!.byDevice.desktop).toBe("3");
  });

  it("finds a half step by its name", () => {
    const next = rebindPrunedSpacingTokens(
      [use("gap", { desktop: "2-5" })],
      2.5,
      [2, 4],
    );
    expect(next[0]!.byDevice.desktop).toBe("2");
  });

  it("leaves radius uses, typed lengths and other steps alone", () => {
    const radius: LayoutToken = {
      ...use("surface", { desktop: "4" }),
      kind: "radius",
    };
    const typed = use("typed", { desktop: "20px" });
    const other = use("other", { desktop: "6" });
    const next = rebindPrunedSpacingTokens([radius, typed, other], 4, [3, 6]);
    expect(next).toEqual([radius, typed, other]);
    expect(next[2]).toBe(other);
  });

  it("changes nothing when no step remains", () => {
    const layout = [use("gap", { desktop: "4" })];
    expect(rebindPrunedSpacingTokens(layout, 4, [])).toEqual(layout);
  });

  it("toggles and rebinds as one edit, and keeping a step moves nothing", () => {
    const layout = [use("gap", { desktop: "4" })];
    const scale = { ...defaultSpacingScale(), steps: [2, 4, 8] };
    const pruned = toggleSpacingStepWithLayout(scale, layout, 4);
    expect(pruned.spacing.steps).toEqual([2, 8]);
    expect(pruned.layout[0]!.byDevice.desktop).toBe("2");
    const kept = toggleSpacingStepWithLayout(pruned.spacing, layout, 4);
    expect(kept.spacing.steps).toEqual([2, 4, 8]);
    expect(kept.layout).toEqual(layout);
  });
});
