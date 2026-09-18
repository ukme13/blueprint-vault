import { spacingStepName } from "./spacing";
import {
  sortPreviewDevicesByWidth,
  type PreviewDevice,
} from "../typography/preview-devices";

/**
 * Named layout uses that change with viewport width.
 *
 * Not the spacing or radius grid. Those stay one calibration. These names
 * point at a primitive per preview device, the way a semantic colour points
 * at a shade per mode.
 */

export type LayoutTokenKind = "spacing" | "radius";

export interface LayoutToken {
  /** Exported as `--inset-container`, `--gap-section`, `--radius-surface`. */
  id: string;
  name: string;
  description: string;
  kind: LayoutTokenKind;
  /** Preview device id → spacing step name (`4`) or radius token id. */
  byDevice: Record<string, string>;
}

export const DEFAULT_LAYOUT_TOKENS: readonly LayoutToken[] = [
  {
    id: "inset-container",
    name: "Container inset",
    description: "Page and shell padding.",
    kind: "spacing",
    byDevice: { phone: "4", tablet: "6", desktop: "10" },
  },
  {
    id: "gap-section",
    name: "Section gap",
    description: "Space between page sections.",
    kind: "spacing",
    byDevice: { phone: "6", tablet: "10", desktop: "16" },
  },
  {
    id: "radius-surface",
    name: "Surface radius",
    description: "Cards, panels, and other large surfaces.",
    kind: "radius",
    byDevice: { phone: "container", tablet: "container", desktop: "page" },
  },
];

export function layoutVariableName(id: string): string {
  return `--${id}`;
}

export function defaultLayoutTokens(): LayoutToken[] {
  return DEFAULT_LAYOUT_TOKENS.map((token) => ({
    ...token,
    byDevice: { ...token.byDevice },
  }));
}

function fallbackForDevice(
  token: LayoutToken,
  deviceId: string,
  devices: readonly PreviewDevice[],
): string {
  const existing = token.byDevice[deviceId];
  if (existing) return existing;
  const desktop = token.byDevice.desktop;
  const ordered = sortPreviewDevicesByWidth([...devices]);
  const index = ordered.findIndex((device) => device.id === deviceId);
  if (index > 0) {
    const previous = token.byDevice[ordered[index - 1]!.id];
    if (previous) return previous;
  }
  return (
    desktop ??
    Object.values(token.byDevice)[0] ??
    (token.kind === "radius" ? "container" : "4")
  );
}

function fillDevices(
  token: LayoutToken,
  devices: readonly PreviewDevice[],
): LayoutToken {
  const allowed = new Set(devices.map((device) => device.id));
  const byDevice: Record<string, string> = {};
  for (const device of devices) {
    byDevice[device.id] = fallbackForDevice(token, device.id, devices);
  }
  for (const id of Object.keys(token.byDevice)) {
    if (allowed.has(id)) byDevice[id] = token.byDevice[id]!;
  }
  return { ...token, byDevice };
}

export function normalizeLayoutTokens(
  value: unknown,
  devices: readonly PreviewDevice[],
): LayoutToken[] {
  const seeded = defaultLayoutTokens();
  if (!Array.isArray(value)) {
    return seeded.map((token) => fillDevices(token, devices));
  }

  const byId = new Map<string, LayoutToken>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    if (typeof raw.id !== "string" || typeof raw.kind !== "string") continue;
    if (raw.kind !== "spacing" && raw.kind !== "radius") continue;
    const byDevice =
      raw.byDevice &&
      typeof raw.byDevice === "object" &&
      !Array.isArray(raw.byDevice)
        ? Object.fromEntries(
            Object.entries(raw.byDevice as Record<string, unknown>).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === "string",
            ),
          )
        : {};
    byId.set(raw.id, {
      id: raw.id,
      name: typeof raw.name === "string" ? raw.name : raw.id,
      description: typeof raw.description === "string" ? raw.description : "",
      kind: raw.kind,
      byDevice,
    });
  }

  return seeded.map((seed) => {
    const stored = byId.get(seed.id);
    return fillDevices(stored ?? seed, devices);
  });
}

export function setLayoutReference(
  tokens: readonly LayoutToken[],
  tokenId: string,
  deviceId: string,
  primitiveId: string,
): LayoutToken[] {
  return tokens.map((token) =>
    token.id !== tokenId
      ? token
      : {
          ...token,
          byDevice: { ...token.byDevice, [deviceId]: primitiveId },
        },
  );
}

export function pruneLayoutDevices(
  tokens: readonly LayoutToken[],
  deviceIds: readonly string[],
): LayoutToken[] {
  const allowed = new Set(deviceIds);
  return tokens.map((token) => ({
    ...token,
    byDevice: Object.fromEntries(
      Object.entries(token.byDevice).filter(([id]) => allowed.has(id)),
    ),
  }));
}

/** CSS alias for one use on one frame, e.g. `var(--spacing-4)`. */
export function layoutPrimitiveVar(
  token: LayoutToken,
  deviceId: string,
): string {
  const primitive = token.byDevice[deviceId];
  if (!primitive) return "inherit";
  if (token.kind === "radius") return `var(--radius-${primitive})`;
  const step = Number(primitive);
  const name = Number.isFinite(step) ? spacingStepName(step) : primitive;
  return `var(--spacing-${name})`;
}

/**
 * Custom properties for the layout uses, rewritten at each preview width.
 *
 * Phone (narrowest) sits on `:root`. Later frames are `min-width` queries.
 */
export function formatLayoutCss(
  tokens: readonly LayoutToken[],
  devices: readonly PreviewDevice[],
): string {
  const ordered = sortPreviewDevicesByWidth([...devices]);
  if (ordered.length === 0) return "";

  const block = (frame: PreviewDevice, indent: string) =>
    tokens.map(
      (token) =>
        `${indent}${layoutVariableName(token.id)}: ${layoutPrimitiveVar(token, frame.id)};`,
    );

  const first = ordered[0]!;
  const lines = [":root {", ...block(first, "  "), "}"];
  for (const frame of ordered.slice(1)) {
    lines.push(
      "",
      `@media (min-width: ${frame.widthPx}px) {`,
      "  :root {",
      ...block(frame, "    "),
      "  }",
      "}",
    );
  }
  return `${lines.join("\n")}\n`;
}
