import { describe, expect, it } from "vitest";
import { defaultPreviewDevices } from "../typography/preview-devices";
import {
  addLayoutToken,
  duplicateLayoutToken,
  removeLayoutToken,
  renameLayoutToken,
  resetLayoutToken,
  setLayoutReference,
} from "./layout-edit";
import { tokenNameKey } from "./token-names";
import {
  defaultLayoutTokens,
  isSystemLayoutToken,
  normalizeLayoutTokens,
  SYSTEM_LAYOUT_TOKEN_IDS,
  type LayoutToken,
} from "./layout-tokens";

const devices = defaultPreviewDevices();
const SYSTEM = [
  "inset-container",
  "gap-section",
  "radius-surface",
  "radius-button",
  "radius-input",
  "radius-chip",
];

function withCustom(label = "Hero inset"): LayoutToken[] {
  return addLayoutToken(defaultLayoutTokens(), "spacing", devices, label);
}

describe("system layout uses", () => {
  it("are the six the system relies on, and nothing custom", () => {
    expect([...SYSTEM_LAYOUT_TOKEN_IDS].sort()).toEqual([...SYSTEM].sort());
    expect(isSystemLayoutToken("radius-button")).toBe(true);
    expect(isSystemLayoutToken("hero-inset")).toBe(false);
  });

  it("cannot be renamed, duplicated or deleted", () => {
    const tokens = defaultLayoutTokens();
    for (const id of SYSTEM) {
      expect(renameLayoutToken(tokens, id, "Something else")).toEqual(tokens);
      expect(duplicateLayoutToken(tokens, id)).toEqual(tokens);
      expect(removeLayoutToken(tokens, id)).toEqual(tokens);
    }
  });

  it("can still be pointed elsewhere", () => {
    const pill = setLayoutReference(
      defaultLayoutTokens(),
      "radius-button",
      "desktop",
      "full",
    );
    expect(
      pill.find((token) => token.id === "radius-button")?.byDevice.desktop,
    ).toBe("full");
  });

  it("reset to how they ship, on every frame", () => {
    let tokens = setLayoutReference(
      defaultLayoutTokens(),
      "radius-button",
      "desktop",
      "full",
    );
    tokens = setLayoutReference(tokens, "radius-button", "phone", "6px");
    const reset = resetLayoutToken(tokens, "radius-button", devices);
    expect(
      reset.find((token) => token.id === "radius-button")?.byDevice,
    ).toEqual({ phone: "element", tablet: "element", desktop: "element" });
    /* Only that one. */
    expect(reset.filter((token) => token.id !== "radius-button")).toEqual(
      tokens.filter((token) => token.id !== "radius-button"),
    );
  });

  it("leave a custom use alone on reset, which has no default", () => {
    const tokens = withCustom();
    expect(resetLayoutToken(tokens, "hero-inset", devices)).toEqual(tokens);
  });
});

describe("layout use names", () => {
  it("are one name whatever the case, order or separator", () => {
    const key = tokenNameKey("Input radius");
    expect(tokenNameKey("radius input")).toBe(key);
    expect(tokenNameKey("  RADIUS-INPUT ")).toBe(key);
    expect(tokenNameKey("radius-input")).toBe(key);
    expect(tokenNameKey("Input radius 2")).not.toBe(key);
  });

  it("never let a new use take a system use's name", () => {
    for (const label of [
      "input radius",
      "Input Radius",
      "radius input",
      "radius-input",
      "Radius Button",
      "button radius",
    ]) {
      const added = addLayoutToken(
        defaultLayoutTokens(),
        "radius",
        devices,
        label,
      ).at(-1)!;
      expect(added.name).toBe(`${label} 2`);
      expect(SYSTEM).not.toContain(added.id);
      expect(SYSTEM.map(tokenNameKey).includes(tokenNameKey(added.id))).toBe(
        false,
      );
    }
  });

  it("never let a rename take a system use's or another use's name", () => {
    const tokens = addLayoutToken(withCustom(), "spacing", devices, "Grid gap");
    const toSystem = renameLayoutToken(tokens, "hero-inset", "Section Gap");
    expect(
      toSystem.find((token) => token.name.startsWith("Section Gap")),
    ).toMatchObject({
      id: "section-gap-2",
      name: "Section Gap 2",
    });

    const toOther = renameLayoutToken(tokens, "hero-inset", "gap GRID");
    expect(toOther.map((token) => token.name)).toContain("gap GRID 2");
  });

  it("let a use change its own name's case", () => {
    const next = renameLayoutToken(withCustom(), "hero-inset", "HERO inset");
    expect(next.at(-1)).toMatchObject({ id: "hero-inset", name: "HERO inset" });
  });
});

describe("loading a workspace", () => {
  it("restores a missing system use at its default, in its place", () => {
    const stored = defaultLayoutTokens().filter(
      (token) => token.id !== "gap-section",
    );
    const tokens = normalizeLayoutTokens(stored, devices);
    expect(tokens.map((token) => token.id)).toEqual(SYSTEM);
    expect(
      tokens.find((token) => token.id === "gap-section")?.byDevice,
    ).toEqual({ phone: "16", tablet: "16", desktop: "16" });
  });

  it("gives a system use back its own name", () => {
    const stored = defaultLayoutTokens().map((token) =>
      token.id === "radius-surface" ? { ...token, name: "Cards" } : token,
    );
    const surface = normalizeLayoutTokens(stored, devices).find(
      (token) => token.id === "radius-surface",
    );
    expect(surface?.name).toBe("Surface radius");
  });

  it("keeps an old custom duplicate, which can then be deleted", () => {
    /* Made before names were checked: --input-radius beside --radius-input. */
    const stored: LayoutToken[] = [
      ...defaultLayoutTokens(),
      {
        id: "input-radius",
        name: "input radius",
        description: "",
        kind: "radius",
        byDevice: { phone: "full", tablet: "full", desktop: "full" },
      },
    ];
    const tokens = normalizeLayoutTokens(stored, devices);
    expect(tokens.map((token) => token.id)).toContain("input-radius");
    const cleaned = removeLayoutToken(tokens, "input-radius");
    expect(cleaned.map((token) => token.id)).toEqual(SYSTEM);
  });
});
