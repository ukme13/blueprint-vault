/**
 * Named preview frames. Phone, tablet and desktop are always present; a
 * project may add up to two extra desktop sizes, and never invents a fourth
 * kind of device.
 */

import { MAX_RATIO, MIN_RATIO } from "./scale";

export type PreviewDeviceKind = "phone" | "tablet" | "desktop";

export interface PreviewDevice {
  id: string;
  kind: PreviewDeviceKind;
  name: string;
  widthPx: number;
  ratio: number;
}

export const PREVIEW_DEVICES = [
  { id: "phone", kind: "phone", name: "Phone", widthPx: 375 },
  { id: "tablet", kind: "tablet", name: "Tablet", widthPx: 768 },
  { id: "desktop", kind: "desktop", name: "Desktop", widthPx: 1120 },
] as const;

export type RequiredPreviewDeviceId = (typeof PREVIEW_DEVICES)[number]["id"];

export const REQUIRED_PREVIEW_DEVICE_IDS: readonly RequiredPreviewDeviceId[] =
  PREVIEW_DEVICES.map((device) => device.id);

export const MAX_EXTRA_DESKTOPS = 2;
export const MIN_PREVIEW_WIDTH_PX = 320;
export const MAX_PREVIEW_WIDTH_PX = 2560;

const EXTRA_DESKTOP_WIDTHS = [1440, 1920] as const;
const DEFAULT_RATIO = 1.25;

/** Older preview width ids that named the same frames. */
const DEVICE_ALIASES: Record<string, RequiredPreviewDeviceId> = {
  mobile: "phone",
};

function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

function clampWidth(width: number, fallback: number): number {
  if (!Number.isFinite(width)) return fallback;
  return Math.round(
    Math.min(MAX_PREVIEW_WIDTH_PX, Math.max(MIN_PREVIEW_WIDTH_PX, width)),
  );
}

export function isRequiredPreviewDevice(
  id: string,
): id is RequiredPreviewDeviceId {
  return id === "phone" || id === "tablet" || id === "desktop";
}

function extraDesktopName(index: number): string {
  return `Desktop ${index + 2}`;
}

function requiredTemplate(
  id: RequiredPreviewDeviceId,
  ratio: number,
): PreviewDevice {
  const template = PREVIEW_DEVICES.find((device) => device.id === id)!;
  return {
    id: template.id,
    kind: template.kind,
    name: template.name,
    widthPx: template.widthPx,
    ratio: clampRatio(ratio),
  };
}

export function defaultPreviewDevices(ratio = DEFAULT_RATIO): PreviewDevice[] {
  return REQUIRED_PREVIEW_DEVICE_IDS.map((id) => requiredTemplate(id, ratio));
}

function extraDesktopCount(devices: readonly PreviewDevice[]): number {
  return devices.filter((device) => !isRequiredPreviewDevice(device.id)).length;
}

export function canAddExtraDesktop(devices: readonly PreviewDevice[]): boolean {
  return extraDesktopCount(devices) < MAX_EXTRA_DESKTOPS;
}

function nextExtraId(devices: readonly PreviewDevice[]): string {
  const used = new Set(devices.map((device) => device.id));
  for (let n = 1; n <= MAX_EXTRA_DESKTOPS + 2; n += 1) {
    const id = `desktop-extra-${n}`;
    if (!used.has(id)) return id;
  }
  return `desktop-extra-${devices.length}`;
}

function parseRequiredId(value: string): RequiredPreviewDeviceId | null {
  const id = DEVICE_ALIASES[value] ?? value;
  return isRequiredPreviewDevice(id) ? id : null;
}

function parseStoredDevice(
  raw: unknown,
  fallbackRatio: number,
): PreviewDevice | null {
  if (typeof raw === "string") {
    const id = parseRequiredId(raw);
    return id ? requiredTemplate(id, fallbackRatio) : null;
  }

  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string") return null;

  const requiredId = parseRequiredId(record.id);
  if (requiredId) {
    const template = requiredTemplate(requiredId, fallbackRatio);
    return {
      ...template,
      widthPx:
        typeof record.widthPx === "number"
          ? clampWidth(record.widthPx, template.widthPx)
          : template.widthPx,
      ratio:
        typeof record.ratio === "number"
          ? clampRatio(record.ratio)
          : template.ratio,
    };
  }

  const kind = record.kind;
  const looksDesktop = kind === "desktop" || record.id.startsWith("desktop");
  if (!looksDesktop) return null;

  const widthPx =
    typeof record.widthPx === "number"
      ? clampWidth(record.widthPx, EXTRA_DESKTOP_WIDTHS[0])
      : EXTRA_DESKTOP_WIDTHS[0];
  const ratio =
    typeof record.ratio === "number"
      ? clampRatio(record.ratio)
      : clampRatio(fallbackRatio);

  return {
    id: record.id,
    kind: "desktop",
    name:
      typeof record.name === "string" && record.name.trim()
        ? record.name
        : extraDesktopName(0),
    widthPx,
    ratio,
  };
}

function orderDevices(devices: readonly PreviewDevice[]): PreviewDevice[] {
  const required = REQUIRED_PREVIEW_DEVICE_IDS.map((id) =>
    devices.find((device) => device.id === id)!,
  );
  const extras = devices
    .filter((device) => !isRequiredPreviewDevice(device.id))
    .slice(0, MAX_EXTRA_DESKTOPS)
    .map((device, index) => ({
      ...device,
      kind: "desktop" as const,
      name: extraDesktopName(index),
    }));
  return [...required, ...extras];
}

/**
 * Phone, tablet and desktop, in that order, then up to two extra desktops.
 *
 * A legacy save stored which of the three were visible. Those lists no longer
 * hide a required frame — missing ones are filled back from the defaults.
 */
export function normalizePreviewDevices(
  value: unknown,
  fallbackRatio = DEFAULT_RATIO,
): PreviewDevice[] {
  const defaults = defaultPreviewDevices(fallbackRatio);
  const incoming = Array.isArray(value) ? value : [];
  const parsed = incoming
    .map((item) => parseStoredDevice(item, fallbackRatio))
    .filter((device): device is PreviewDevice => device !== null);

  const byId = new Map<string, PreviewDevice>();
  for (const device of parsed) {
    if (!byId.has(device.id)) byId.set(device.id, device);
  }

  const required = defaults.map((fallback) => {
    const saved = byId.get(fallback.id);
    return saved ?? fallback;
  });
  const extras = parsed.filter((device) => !isRequiredPreviewDevice(device.id));

  return orderDevices([...required, ...extras]);
}

export function addExtraDesktop(
  devices: readonly PreviewDevice[],
): PreviewDevice[] {
  const current = normalizePreviewDevices(devices);
  if (!canAddExtraDesktop(current)) return current;

  const usedWidths = new Set(current.map((device) => device.widthPx));
  const last = current[current.length - 1]!;
  const width =
    EXTRA_DESKTOP_WIDTHS.find((candidate) => !usedWidths.has(candidate)) ??
    Math.min(MAX_PREVIEW_WIDTH_PX, last.widthPx + 320);
  const desktop = current.find((device) => device.id === "desktop") ?? last;

  return orderDevices([
    ...current,
    {
      id: nextExtraId(current),
      kind: "desktop",
      name: extraDesktopName(extraDesktopCount(current)),
      widthPx: width,
      ratio: desktop.ratio,
    },
  ]);
}

export function removePreviewDevice(
  devices: readonly PreviewDevice[],
  id: string,
): PreviewDevice[] {
  if (isRequiredPreviewDevice(id)) return normalizePreviewDevices(devices);
  return normalizePreviewDevices(devices.filter((device) => device.id !== id));
}

export function updatePreviewDevice(
  devices: readonly PreviewDevice[],
  id: string,
  patch: Partial<Pick<PreviewDevice, "widthPx" | "ratio">>,
): PreviewDevice[] {
  return normalizePreviewDevices(
    devices.map((device) => {
      if (device.id !== id) return device;
      return {
        ...device,
        widthPx:
          patch.widthPx !== undefined
            ? clampWidth(patch.widthPx, device.widthPx)
            : device.widthPx,
        ratio:
          patch.ratio !== undefined ? clampRatio(patch.ratio) : device.ratio,
      };
    }),
  );
}

/** The active frame, or desktop if that id is gone, else the first required. */
export function resolvePreviewDevice(
  active: string | undefined,
  devices: readonly PreviewDevice[],
): PreviewDevice {
  const list =
    devices.length > 0 ? devices : defaultPreviewDevices(DEFAULT_RATIO);
  return (
    list.find((device) => device.id === active) ??
    list.find((device) => device.id === "desktop") ??
    list[0]!
  );
}
