import { spacingStepName } from "./spacing";
import {
  sortPreviewDevicesByWidth,
  type PreviewDevice,
} from "../typography/preview-devices";

/**
 * Named layout uses that change with viewport width.
 *
 * Not the spacing or radius grid. Those stay one calibration. These names
 * point at a primitive per preview device, or a typed px, the way a type
 * role binds to a step or unlinks to a size.
 */

export type LayoutTokenKind = "spacing" | "radius";

export interface LayoutToken {
  /** Exported as `--inset-container`, `--inset-hero`, `--gap-grid`. */
  id: string;
  name: string;
  description: string;
  kind: LayoutTokenKind;
  /**
   * Preview device id → spacing step name (`4`), radius token id
   * (`container`), or a typed length (`20px`).
   */
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

const RAW_PX = /^(-?\d+(?:\.\d+)?)px$/i;

export function isLayoutRawPx(value: string): boolean {
  return RAW_PX.test(value.trim());
}

export function parseLayoutRawPx(value: string): number | undefined {
  const match = RAW_PX.exec(value.trim());
  if (!match) return undefined;
  const px = Number(match[1]);
  return Number.isFinite(px) ? px : undefined;
}

export function formatLayoutRawPx(px: number): string {
  return `${Math.round(px)}px`;
}

export function isLayoutPrimitive(
  kind: LayoutTokenKind,
  value: string,
): boolean {
  if (!value || isLayoutRawPx(value)) return false;
  if (kind === "radius") return /^[a-z][a-z0-9-]*$/i.test(value);
  return /^[0-9]+(-[0-9]+)?$/.test(value);
}

export function isLayoutCellValue(
  kind: LayoutTokenKind,
  value: string,
): boolean {
  return isLayoutPrimitive(kind, value) || isLayoutRawPx(value);
}

function isLayoutTokenId(id: string): boolean {
  return /^[a-z][a-z0-9-]*$/i.test(id);
}

function cellOrUndefined(
  kind: LayoutTokenKind,
  value: string | undefined,
): string | undefined {
  return value && isLayoutCellValue(kind, value) ? value : undefined;
}

function fallbackForDevice(
  token: LayoutToken,
  deviceId: string,
  devices: readonly PreviewDevice[],
): string {
  const existing = cellOrUndefined(token.kind, token.byDevice[deviceId]);
  if (existing) return existing;
  const desktop = cellOrUndefined(token.kind, token.byDevice.desktop);
  const ordered = sortPreviewDevicesByWidth([...devices]);
  const index = ordered.findIndex((device) => device.id === deviceId);
  if (index > 0) {
    const previous = cellOrUndefined(
      token.kind,
      token.byDevice[ordered[index - 1]!.id],
    );
    if (previous) return previous;
  }
  const first = Object.values(token.byDevice).find((value) =>
    isLayoutCellValue(token.kind, value),
  );
  return desktop ?? first ?? (token.kind === "radius" ? "container" : "4");
}

function fillDevices(
  token: LayoutToken,
  devices: readonly PreviewDevice[],
): LayoutToken {
  const byDevice: Record<string, string> = {};
  for (const device of devices) {
    byDevice[device.id] = fallbackForDevice(token, device.id, devices);
  }
  return { ...token, byDevice };
}

export { fillDevices as fillLayoutDevices };

export function normalizeLayoutTokens(
  value: unknown,
  devices: readonly PreviewDevice[],
): LayoutToken[] {
  if (!Array.isArray(value)) {
    return defaultLayoutTokens().map((token) => fillDevices(token, devices));
  }

  const seen = new Set<string>();
  const parsed: LayoutToken[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    if (typeof raw.id !== "string" || !isLayoutTokenId(raw.id)) continue;
    if (seen.has(raw.id)) continue;
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
    seen.add(raw.id);
    parsed.push({
      id: raw.id,
      name: typeof raw.name === "string" ? raw.name : raw.id,
      description: typeof raw.description === "string" ? raw.description : "",
      kind: raw.kind,
      byDevice,
    });
  }

  return parsed.map((token) => fillDevices(token, devices));
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

/** CSS value for one use on one frame: a primitive alias or a typed px. */
export function layoutPrimitiveVar(
  token: LayoutToken,
  deviceId: string,
): string {
  const cell = token.byDevice[deviceId];
  if (!cell) return "inherit";
  const px = parseLayoutRawPx(cell);
  if (px !== undefined) return formatLayoutRawPx(px);
  if (token.kind === "radius") return `var(--radius-${cell})`;
  const step = Number(cell);
  const name = Number.isFinite(step) ? spacingStepName(step) : cell;
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
