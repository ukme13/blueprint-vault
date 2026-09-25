import { describe, expect, it } from "vitest";
import { defaultPreviewDevices } from "../typography/preview-devices";
import {
  componentRadiusCss,
  layoutRadiusPx,
  radiusUseSamples,
} from "./component-radius";
import {
  COMPONENT_RADIUS_USES,
  defaultLayoutTokens,
  formatLayoutCss,
  layoutCssVariablesForDevice,
  normalizeLayoutTokens,
} from "./layout-tokens";
import { setLayoutReference } from "./layout-edit";
import { defaultRadiusScale } from "./radius";

const devices = defaultPreviewDevices();
const COMPONENT_IDS = ["radius-button", "radius-input", "radius-chip"];

/** A workspace saved before component radius: the three original seeds. */
function legacyUses() {
  return defaultLayoutTokens().filter(
    (token) => !COMPONENT_IDS.includes(token.id),
  );
}

describe("component radius uses", () => {
  it("default to what each control used before", () => {
    const byId = Object.fromEntries(
      COMPONENT_RADIUS_USES.map((use) => [use.id, use.byDevice]),
    );
    expect(byId["radius-button"]).toEqual({
      phone: "element",
      tablet: "element",
      desktop: "element",
    });
    expect(byId["radius-input"]?.desktop).toBe("element");
    expect(byId["radius-chip"]?.desktop).toBe("inner");
    expect(COMPONENT_RADIUS_USES.every((use) => use.kind === "radius")).toBe(
      true,
    );
  });

  it("reach a workspace saved before they existed", () => {
    const ids = normalizeLayoutTokens(legacyUses(), devices).map(
      (token) => token.id,
    );
    expect(ids).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
      ...COMPONENT_IDS,
    ]);
  });

  it("come back in place when one was removed before they were protected", () => {
    const withoutChip = defaultLayoutTokens().filter(
      (token) => token.id !== "radius-chip",
    );
    const ids = normalizeLayoutTokens(withoutChip, devices).map(
      (token) => token.id,
    );
    expect(ids).toEqual([
      "inset-container",
      "gap-section",
      "radius-surface",
      ...COMPONENT_IDS,
    ]);
  });

  it("keep a choice through a round trip", () => {
    const pill = setLayoutReference(
      defaultLayoutTokens(),
      "radius-button",
      "desktop",
      "full",
    );
    const back = normalizeLayoutTokens(pill, devices);
    expect(
      back.find((token) => token.id === "radius-button")?.byDevice.desktop,
    ).toBe("full");
  });
});

describe("component radius as CSS", () => {
  it("writes each as an alias of its base radius, or a typed px", () => {
    const tokens = setLayoutReference(
      defaultLayoutTokens(),
      "radius-input",
      "desktop",
      "6px",
    );
    const desktop = layoutCssVariablesForDevice(tokens, "desktop");
    expect(desktop["--radius-button"]).toBe("var(--radius-element)");
    expect(desktop["--radius-input"]).toBe("6px");
    expect(desktop["--radius-chip"]).toBe("var(--radius-inner)");
  });

  it("emits them in the exported stylesheet, per frame", () => {
    const tokens = setLayoutReference(
      defaultLayoutTokens(),
      "radius-button",
      "desktop",
      "full",
    );
    const css = formatLayoutCss(tokens, devices);
    const [phone, ...wider] = css.split("@media");
    expect(phone).toContain("--radius-button: var(--radius-element);");
    expect(wider.at(-1)).toContain("--radius-button: var(--radius-full);");
  });

  it("falls back to the base radius a control used before", () => {
    expect(componentRadiusCss("radius-button")).toBe(
      "var(--radius-button, var(--radius-element))",
    );
    expect(componentRadiusCss("radius-input")).toBe(
      "var(--radius-input, var(--radius-element))",
    );
    expect(componentRadiusCss("radius-chip")).toBe(
      "var(--radius-chip, var(--radius-inner))",
    );
    expect(componentRadiusCss("radius-surface")).toBe(
      "var(--radius-surface, var(--radius-container))",
    );
    expect(componentRadiusCss("radius-custom")).toBe("var(--radius-custom)");
  });
});

describe("component radius in px", () => {
  const scale = defaultRadiusScale();

  it("resolves a base radius at the current roundness", () => {
    expect(layoutRadiusPx("element", scale)).toBe(8);
    expect(layoutRadiusPx("element", { ...scale, multiplier: 2 })).toBe(16);
    expect(layoutRadiusPx("full", scale)).toBe(9999);
  });

  it("keeps a typed px as written, and knows nothing of a missing cell", () => {
    expect(layoutRadiusPx("6px", scale)).toBe(6);
    expect(layoutRadiusPx(undefined, scale)).toBeUndefined();
    expect(layoutRadiusPx("gone", scale)).toBeUndefined();
  });

  it("draws one sample per radius use, shaped for its component", () => {
    const tokens = setLayoutReference(
      defaultLayoutTokens(),
      "radius-chip",
      "phone",
      "full",
    );
    const phone = radiusUseSamples(tokens, "phone", scale);
    expect(phone.map((sample) => [sample.shape, sample.px])).toEqual([
      ["card", 12],
      ["button", 8],
      ["input", 8],
      ["chip", 9999],
    ]);
    expect(
      radiusUseSamples(tokens, "desktop", scale).find(
        (sample) => sample.shape === "card",
      )?.px,
    ).toBe(28);
  });

  it("draws a custom radius use as a plain box", () => {
    const tokens = [
      ...defaultLayoutTokens(),
      {
        id: "radius-avatar",
        name: "Avatar radius",
        description: "",
        kind: "radius" as const,
        byDevice: { phone: "full", tablet: "full", desktop: "full" },
      },
    ];
    expect(radiusUseSamples(tokens, "phone", scale).at(-1)).toEqual({
      id: "radius-avatar",
      name: "Avatar radius",
      shape: "box",
      px: 9999,
    });
  });
});
