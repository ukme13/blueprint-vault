import { describe, expect, it } from "vitest";
import {
  REQUIRED_PREVIEW_DEVICE_IDS,
  MAX_EXTRA_DESKTOPS,
  addExtraDesktop,
  canAddExtraDesktop,
  defaultPreviewDevices,
  isRequiredPreviewDevice,
  sortPreviewDevicesByWidth,
  normalizePreviewDevices,
  removePreviewDevice,
  resolvePreviewDevice,
  updatePreviewDevice,
} from "./preview-devices";

const RATIO = 1.25;

describe("defaultPreviewDevices", () => {
  it("starts with phone, tablet and desktop at the given ratio", () => {
    expect(defaultPreviewDevices(RATIO).map((device) => device.id)).toEqual([
      "phone",
      "tablet",
      "desktop",
    ]);
    expect(REQUIRED_PREVIEW_DEVICE_IDS).toEqual(["phone", "tablet", "desktop"]);
    expect(
      defaultPreviewDevices(1.5).every((device) => device.ratio === 1.5),
    ).toBe(true);
  });
});

describe("normalizePreviewDevices", () => {
  it("defaults to phone, tablet and desktop", () => {
    expect(
      normalizePreviewDevices(undefined).map((device) => device.id),
    ).toEqual(["phone", "tablet", "desktop"]);
  });

  it("restores every required frame from a legacy hide/show list", () => {
    expect(
      normalizePreviewDevices(["desktop", "phone"]).map((device) => device.id),
    ).toEqual(["phone", "tablet", "desktop"]);
  });

  it("renames the old mobile id to phone", () => {
    expect(
      normalizePreviewDevices(["mobile", "tablet"]).map((device) => device.id),
    ).toEqual(["phone", "tablet", "desktop"]);
  });

  it("drops unknown ids rather than inventing a viewport kind", () => {
    expect(
      normalizePreviewDevices(["phone", "watch", "tablet"]).map(
        (device) => device.id,
      ),
    ).toEqual(["phone", "tablet", "desktop"]);
  });

  it("fills the three required frames when a save would leave fewer", () => {
    expect(
      normalizePreviewDevices(["desktop"]).map((device) => device.id),
    ).toEqual(["phone", "tablet", "desktop"]);
    expect(normalizePreviewDevices([])).toHaveLength(3);
  });

  it("keeps saved widths and ratios on the required frames", () => {
    const devices = normalizePreviewDevices(
      [
        { id: "phone", widthPx: 390, ratio: 1.2 },
        { id: "tablet", widthPx: 800, ratio: 1.25 },
        { id: "desktop", widthPx: 1280, ratio: 1.333 },
      ],
      RATIO,
    );
    expect(devices[0]).toMatchObject({
      id: "phone",
      widthPx: 390,
      ratio: 1.2,
    });
    expect(devices[2]).toMatchObject({
      id: "desktop",
      widthPx: 1280,
      ratio: 1.333,
    });
  });

  it("keeps at most two extra desktops", () => {
    const devices = normalizePreviewDevices([
      ...defaultPreviewDevices(RATIO),
      { id: "desktop-extra-1", kind: "desktop", widthPx: 1440, ratio: RATIO },
      { id: "desktop-extra-2", kind: "desktop", widthPx: 1920, ratio: RATIO },
      { id: "desktop-extra-3", kind: "desktop", widthPx: 2560, ratio: RATIO },
    ]);
    expect(devices.map((device) => device.id)).toEqual([
      "phone",
      "tablet",
      "desktop",
      "desktop-extra-1",
      "desktop-extra-2",
    ]);
    expect(devices[3]?.name).toBe("Desktop 2");
    expect(devices[4]?.name).toBe("Desktop 3");
  });
});

describe("addExtraDesktop and removePreviewDevice", () => {
  it("adds up to two extra desktop sizes", () => {
    const once = addExtraDesktop(defaultPreviewDevices(RATIO));
    expect(once).toHaveLength(4);
    expect(once[3]).toMatchObject({
      kind: "desktop",
      name: "Desktop 2",
      widthPx: 1440,
      ratio: RATIO,
    });
    expect(canAddExtraDesktop(once)).toBe(true);

    const twice = addExtraDesktop(once);
    expect(twice).toHaveLength(3 + MAX_EXTRA_DESKTOPS);
    expect(twice[4]).toMatchObject({
      name: "Desktop 3",
      widthPx: 1920,
    });
    expect(canAddExtraDesktop(twice)).toBe(false);
    expect(addExtraDesktop(twice)).toEqual(twice);
  });

  it("cannot remove phone, tablet or desktop", () => {
    const devices = defaultPreviewDevices(RATIO);
    expect(removePreviewDevice(devices, "phone")).toEqual(devices);
    expect(removePreviewDevice(devices, "tablet")).toEqual(devices);
    expect(removePreviewDevice(devices, "desktop")).toEqual(devices);
    expect(isRequiredPreviewDevice("phone")).toBe(true);
    expect(isRequiredPreviewDevice("desktop-extra-1")).toBe(false);
  });

  it("removes an extra desktop and renames the one that remains", () => {
    const withTwo = addExtraDesktop(
      addExtraDesktop(defaultPreviewDevices(RATIO)),
    );
    const firstExtra = withTwo[3]!.id;
    const remaining = removePreviewDevice(withTwo, firstExtra);
    expect(remaining).toHaveLength(4);
    expect(remaining[3]?.name).toBe("Desktop 2");
    expect(remaining[3]?.widthPx).toBe(1920);
  });
});

describe("updatePreviewDevice", () => {
  it("clamps width and ratio on the named frame", () => {
    const devices = updatePreviewDevice(defaultPreviewDevices(RATIO), "phone", {
      widthPx: 410.4,
      ratio: 1.067,
    });
    expect(devices[0]).toMatchObject({ widthPx: 410, ratio: 1.067 });
  });
});

describe("resolvePreviewDevice", () => {
  it("keeps the active device when it is still offered", () => {
    const devices = defaultPreviewDevices(RATIO);
    expect(resolvePreviewDevice("tablet", devices).id).toBe("tablet");
  });

  it("falls back to desktop, then to the first frame", () => {
    const devices = defaultPreviewDevices(RATIO);
    expect(resolvePreviewDevice("missing", devices).id).toBe("desktop");
    expect(resolvePreviewDevice("gone", []).id).toBe("desktop");
  });

  it("keeps an extra desktop while it exists", () => {
    const devices = addExtraDesktop(defaultPreviewDevices(RATIO));
    const extra = devices[3]!;
    expect(resolvePreviewDevice(extra.id, devices).id).toBe(extra.id);
    expect(
      resolvePreviewDevice(extra.id, defaultPreviewDevices(RATIO)).id,
    ).toBe("desktop");
  });
});

describe("sortPreviewDevicesByWidth", () => {
  it("orders by width, then id", () => {
    const [phone, tablet, desktop] = defaultPreviewDevices(RATIO);
    const extra = {
      id: "desktop-extra-1",
      kind: "desktop" as const,
      name: "Desktop 2",
      widthPx: 500,
      ratio: RATIO,
    };
    expect(
      sortPreviewDevicesByWidth([desktop!, extra, phone!, tablet!]).map(
        (device) => device.id,
      ),
    ).toEqual(["phone", "desktop-extra-1", "tablet", "desktop"]);
  });
});
