import { describe, expect, it } from "vitest";
import { defaultPreviewDevices } from "../typography/preview-devices";
import {
  defaultLayoutTokens,
  formatLayoutCss,
  normalizeLayoutTokens,
  pruneLayoutDevices,
  setLayoutReference,
} from "./layout-tokens";

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
});
