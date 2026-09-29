import { describe, expect, it } from "vitest";
import { generateTypeSteps } from "./scale";
import {
  assessTypeSystem,
  bodyRoleOf,
  openTypeScaleWarnings,
  previewFontFor,
  previewWeightFor,
  roleStyleOnDevice,
} from "./studio";
import { defaultGroups, type TypeRole, type TypeSystem } from "./system";

function role(id: string, groupId: string, over: Partial<TypeRole> = {}) {
  return {
    id,
    name: id,
    groupId,
    fontId: "base",
    fontWeight: 400,
    textTransform: "none" as const,
    stepOffset: 0,
    sameAsRoleId: null,
    lineHeight: { mode: "ratio" as const, value: 1.5 },
    letterSpacingPx: 0,
    unlinkedSizes: {},
    unlinkedLineHeights: {},
    unlinkedLetterSpacings: {},
    ...over,
  };
}

function system(over: Partial<TypeSystem> = {}): TypeSystem {
  return {
    id: "s",
    name: "S",
    groups: defaultGroups(),
    baseFontSizePx: 16,
    ratio: 1.25,
    stepCount: 9,
    fonts: [
      {
        id: "base",
        name: "Base",
        families: ["Inter"],
        sources: { primary: "system" },
      },
    ],
    roles: [role("body", "body")],
    ...over,
  };
}

const stepsOf = (s: TypeSystem) =>
  generateTypeSteps(s.baseFontSizePx, s.ratio, s.stepCount);

describe("bodyRoleOf", () => {
  it("prefers the role named body, then the first in the body group", () => {
    const named = system({
      roles: [role("body-2", "body"), role("body", "body")],
    });
    expect(bodyRoleOf(named)?.id).toBe("body");

    const grouped = system({ roles: [role("h1", "h"), role("copy", "body")] });
    expect(bodyRoleOf(grouped)?.id).toBe("copy");

    expect(bodyRoleOf(system({ roles: [role("h1", "h")] }))).toBeUndefined();
  });
});

describe("assessTypeSystem", () => {
  it("runs every check, in a fixed order, each under its own id", () => {
    const s = system();
    const warnings = assessTypeSystem(s, stepsOf(s), "desktop", "Hello");
    expect(warnings.map((warning) => warning.id)).toEqual([
      "body-size",
      "line-height",
      "scale-growth",
      "step-count",
      "role-weights",
    ]);
    expect(openTypeScaleWarnings(warnings)).toEqual([]);
  });

  it("judges the body at the size it has on the device", () => {
    /* 11px on a phone only (stored under its canonical id): the desktop is
       fine, the phone is not. */
    const s = system({
      roles: [role("body", "body", { unlinkedSizes: { phone: 11 } })],
    });
    const on = (device: string) =>
      assessTypeSystem(s, stepsOf(s), device, "")[0];
    expect(on("desktop")?.status).toBe("pass");
    expect(on("mobile")?.status).not.toBe("pass");
  });

  it("leaves out the body checks when there is no body to judge", () => {
    const s = system({ roles: [role("h1", "h")] });
    const ids = assessTypeSystem(s, stepsOf(s), "desktop", "").map(
      (warning) => warning.id,
    );
    expect(ids).not.toContain("body-size");
    expect(ids).not.toContain("line-height");
    expect(ids).toContain("scale-growth");
  });

  it("holds Thai copy to a looser line-height than Latin", () => {
    const s = system({
      roles: [
        role("body", "body", { lineHeight: { mode: "ratio", value: 1.3 } }),
      ],
    });
    const lineHeight = (text: string) =>
      assessTypeSystem(s, stepsOf(s), "desktop", text).find(
        (warning) => warning.id === "line-height",
      )?.status;
    expect(lineHeight("Hello")).toBe("pass");
    expect(lineHeight("ออกแบบด้วยความชัดเจน")).not.toBe("pass");
  });

  it("counts only what is worth acting on", () => {
    const s = system({ stepCount: 15, ratio: 1.8 });
    const open = openTypeScaleWarnings(
      assessTypeSystem(s, stepsOf(s), "desktop", ""),
    );
    expect(open.map((warning) => warning.id)).toEqual(
      expect.arrayContaining(["scale-growth", "step-count"]),
    );
    expect(open.every((warning) => warning.status !== "pass")).toBe(true);
  });
});

describe("roleStyleOnDevice", () => {
  it("resolves a role to px size, family, weight, ratio and em tracking", () => {
    const body = role("body", "body", {
      fontWeight: 500,
      letterSpacingPx: 1.6,
      textTransform: "uppercase",
    });
    const s = system({ roles: [body] });
    const steps = stepsOf(s);
    const style = roleStyleOnDevice(s, steps, steps, body, "desktop");

    expect(style.fontSize).toBe("16px");
    expect(style.fontFamily).toContain("Inter");
    expect(style.fontWeight).toBe(500);
    expect(style.lineHeight).toBeCloseTo(1.5, 5);
    expect(style.letterSpacing).toBe("0.1em");
    expect(style.textTransform).toBe("uppercase");
  });

  it("measures tracking against the desktop size, as the export does", () => {
    const body = role("body", "body", {
      letterSpacingPx: 1.6,
      unlinkedSizes: { phone: 32 },
    });
    const s = system({ roles: [body] });
    const steps = stepsOf(s);
    const style = roleStyleOnDevice(s, steps, steps, body, "mobile");
    expect(style.fontSize).toBe("32px");
    /* 1.6px over the 16px desktop size, not over the 32px phone size. */
    expect(style.letterSpacing).toBe("0.1em");
  });
});

describe("previewFontFor", () => {
  const fonts = [
    { id: "base", name: "Base", families: ["Inter"], sources: {} },
    { id: "display", name: "Display", families: ["Lora"], sources: {} },
  ] as TypeSystem["fonts"];

  it("takes the chosen font, else body's, else the first", () => {
    const s = system({
      fonts,
      roles: [role("body", "body", { fontId: "display" })],
    });
    expect(previewFontFor(s, "base")?.id).toBe("base");
    expect(previewFontFor(s, null)?.id).toBe("display");
    /* A chosen entry since removed falls through to body's. */
    expect(previewFontFor(s, "gone")?.id).toBe("display");
    expect(previewFontFor(system({ fonts, roles: [] }), null)?.id).toBe("base");
  });
});

describe("previewWeightFor", () => {
  it("keeps a weight the family ships, else 400, else its first", () => {
    expect(previewWeightFor([300, 400, 700], 700)).toBe(700);
    /* Chosen for another family, which this one does not ship. */
    expect(previewWeightFor([300, 400, 700], 900)).toBe(400);
    expect(previewWeightFor([300, 700], null)).toBe(300);
    expect(previewWeightFor([], null)).toBe(400);
  });
});
