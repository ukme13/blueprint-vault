import { describe, expect, it } from "vitest";
import { defaultPreviewDevices } from "../typography/preview-devices";
import { applyTypeRolePreset } from "../typography/role-presets";
import { generateTypeSteps } from "../typography/scale";
import {
  defaultSystem,
  resolveLineHeight,
  updateRole,
} from "../typography/system";
import {
  buttonHeights,
  controlHeightPx,
  describeButtonHeights,
} from "./control-height";

const desktop = defaultPreviewDevices(1.25).find(
  (device) => device.id === "desktop",
)!;
/* Enterprise has the button group; the default system does not. */
const system = () =>
  applyTypeRolePreset(
    defaultSystem("Scale", ["Inter"], 16, 1.25, 9),
    "enterprise",
  );

describe("controlHeightPx", () => {
  it("is a line, the inset twice and the border twice", () => {
    expect(controlHeightPx(20, 8)).toBe(38);
    expect(controlHeightPx(16, 6)).toBe(30);
    expect(controlHeightPx(20, 8, 0)).toBe(36);
  });

  it("grows by two pixels for every pixel of inset", () => {
    expect(controlHeightPx(20, 9) - controlHeightPx(20, 8)).toBe(2);
  });
});

describe("buttonHeights", () => {
  it("has one height for each button size, named by its suffix", () => {
    const heights = buttonHeights(system(), desktop, 8);
    expect(heights.map((each) => each.size)).toEqual(
      expect.arrayContaining(["md", "sm"]),
    );
    expect(heights.length).toBeGreaterThanOrEqual(2);
  });

  it("puts a larger label in a taller button", () => {
    const [md, sm] = buttonHeights(system(), desktop, 8);
    expect(md!.heightPx).toBeGreaterThanOrEqual(sm!.heightPx);
  });

  it("is the resolved line height plus the inset and the border", () => {
    const sys = system();
    const role = sys.roles.find((each) => each.id === "button-md")!;
    const steps = generateTypeSteps(16, desktop.ratio, sys.stepCount);
    const step = steps.find((each) => each.offset === role.stepOffset)!;
    const line = resolveLineHeight(role, step.fontSizePx, "desktop", sys);
    const md = buttonHeights(sys, desktop, 6).find(
      (each) => each.size === "md",
    )!;
    expect(md.heightPx).toBe(Math.round(line.computedLineHeightPx + 12 + 2));
  });

  it("follows the inset", () => {
    const at = (inset: number) => buttonHeights(system(), desktop, inset)[0]!;
    expect(at(10).heightPx - at(8).heightPx).toBe(4);
  });

  it("follows a size typed for the frame", () => {
    const sys = system();
    const before = buttonHeights(sys, desktop, 8).find(
      (each) => each.size === "md",
    )!;
    const bigger = updateRole(sys, "button-md", {
      unlinkedSizes: { desktop: 32 },
      stepOffset: null,
    });
    const after = buttonHeights(bigger, desktop, 8).find(
      (each) => each.size === "md",
    )!;
    expect(after.heightPx).toBeGreaterThan(before.heightPx);
  });

  it("has the one height of the fallback role without a button group", () => {
    /* The preview seeds its buttons in the label slot's role when there is no
       button role. */
    const bare = defaultSystem("Scale", ["Inter"], 16, 1.25, 9);
    const heights = buttonHeights(bare, desktop, 8);
    expect(heights).toHaveLength(1);
    expect(heights[0]!.size).toBeNull();
    expect(heights[0]!.heightPx).toBeGreaterThan(2 * 8 + 2);
  });

  it("is empty when there is no role at all", () => {
    const none = { ...system(), roles: [] };
    expect(buttonHeights(none, desktop, 8)).toEqual([]);
  });
});

describe("describeButtonHeights", () => {
  it("reads as a hint, largest first as given", () => {
    expect(
      describeButtonHeights([
        { size: "md", heightPx: 40 },
        { size: "sm", heightPx: 32 },
      ]),
    ).toBe("Button: ~40px (md) · ~32px (sm)");
  });

  it("leaves out the size when there is only the fallback", () => {
    expect(describeButtonHeights([{ size: null, heightPx: 44 }])).toBe(
      "Button: ~44px",
    );
  });

  it("says nothing when there is nothing to say", () => {
    expect(describeButtonHeights([])).toBeNull();
  });
});
