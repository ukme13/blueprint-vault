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

/**
 * Component radius: the corner of one kind of control, apart from the rest.
 *
 * Buttons, inputs and chips all sat on `--radius-element` (chips on
 * `--radius-inner`), so a pill button meant pill inputs too. Each is a radius
 * use, pointing at a base radius per frame or a typed px, so it has the same
 * picker, export and preview wiring as Surface radius, which is the card's.
 * The defaults are what each used before, so nothing changes until someone
 * picks otherwise.
 */
export const COMPONENT_RADIUS_USES: readonly LayoutToken[] = [
  {
    id: "radius-button",
    name: "Button radius",
    description: "Buttons, including icon buttons.",
    kind: "radius",
    byDevice: { phone: "element", tablet: "element", desktop: "element" },
  },
  {
    id: "radius-input",
    name: "Input radius",
    description: "Text fields, selects and search boxes.",
    kind: "radius",
    byDevice: { phone: "element", tablet: "element", desktop: "element" },
  },
  {
    id: "radius-chip",
    name: "Chip radius",
    description: "Chips, badges and tags.",
    kind: "radius",
    byDevice: { phone: "inner", tablet: "inner", desktop: "inner" },
  },
];

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
    /* Same step on every frame. The reference landing keeps section padding
       at `--space-6` below 767px; shrinking this to step 6 stacked the bands. */
    byDevice: { phone: "16", tablet: "16", desktop: "16" },
  },
  {
    id: "radius-surface",
    name: "Surface radius",
    description: "Cards, panels, and other large surfaces.",
    kind: "radius",
    byDevice: { phone: "container", tablet: "container", desktop: "page" },
  },
  ...COMPONENT_RADIUS_USES,
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

  return withSystemUses(parsed).map((token) =>
    fillDevices(migrateUnshrunkSectionGap(token), devices),
  );
}

/**
 * The uses the system itself relies on: the preview paints with them and the
 * export promises them, so they cannot be renamed, duplicated or deleted, only
 * pointed elsewhere or reset. Everything else in the list is the author's.
 */
export const SYSTEM_LAYOUT_TOKEN_IDS: readonly string[] =
  DEFAULT_LAYOUT_TOKENS.map((token) => token.id);

export function isSystemLayoutToken(id: string): boolean {
  return SYSTEM_LAYOUT_TOKEN_IDS.includes(id);
}

/** A system use as it ships, filled to these frames. */
export function defaultSystemLayoutToken(
  id: string,
  devices: readonly PreviewDevice[],
): LayoutToken | undefined {
  const seed = DEFAULT_LAYOUT_TOKENS.find((token) => token.id === id);
  if (!seed) return undefined;
  return fillDevices({ ...seed, byDevice: { ...seed.byDevice } }, devices);
}

/**
 * Put every system use back, as the system names it.
 *
 * A workspace can be missing one: saved before component radius existed, or
 * from before system uses were protected, when one could be deleted or
 * renamed away (a rename changed its id, so it left too). A missing one is
 * restored at its default, in its default place among the others; one that
 * is present keeps its pointers but takes back its own name and description,
 * which are no longer the author's to change. An empty list heals like any
 * other: the preview has no corner or inset to paint with otherwise.
 */
function withSystemUses(tokens: LayoutToken[]): LayoutToken[] {
  const next = tokens.map((token) => {
    const seed = DEFAULT_LAYOUT_TOKENS.find((item) => item.id === token.id);
    return seed
      ? {
          ...token,
          name: seed.name,
          description: seed.description,
          kind: seed.kind,
        }
      : token;
  });
  let insertAt = 0;
  for (const seed of DEFAULT_LAYOUT_TOKENS) {
    const index = next.findIndex((token) => token.id === seed.id);
    if (index >= 0) {
      insertAt = index + 1;
      continue;
    }
    next.splice(insertAt, 0, { ...seed, byDevice: { ...seed.byDevice } });
    insertAt += 1;
  }
  return next;
}

/**
 * Workspaces seeded before section gap stopped shrinking on phone/tablet.
 *
 * Those frames used steps 6 and 10 against desktop 16. The landing that
 * token paints is stacked on a phone, and 24px between bands is not the
 * same job as 64px on a wide canvas. Lift only the old default triplet so
 * a pointer someone chose on purpose stays put.
 */
function migrateUnshrunkSectionGap(token: LayoutToken): LayoutToken {
  if (token.id !== "gap-section") return token;
  const { phone, tablet, desktop } = token.byDevice;
  if (phone !== "6" || tablet !== "10" || desktop !== "16") return token;
  return {
    ...token,
    byDevice: { ...token.byDevice, phone: "16", tablet: "16" },
  };
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
  selector = ":root",
): string {
  const ordered = sortPreviewDevicesByWidth([...devices]);
  if (ordered.length === 0) return "";

  const block = (frame: PreviewDevice, indent: string) =>
    tokens.map(
      (token) =>
        `${indent}${layoutVariableName(token.id)}: ${layoutPrimitiveVar(token, frame.id)};`,
    );

  const first = ordered[0]!;
  const lines = [`${selector} {`, ...block(first, "  "), "}"];
  for (const frame of ordered.slice(1)) {
    lines.push(
      "",
      `@media (min-width: ${frame.widthPx}px) {`,
      `  ${selector} {`,
      ...block(frame, "    "),
      "  }",
      "}",
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Layout uses as custom properties for one named frame. */
export function layoutCssVariablesForDevice(
  tokens: readonly LayoutToken[],
  deviceId: string,
): Record<string, string> {
  return Object.fromEntries(
    tokens.map((token) => [
      layoutVariableName(token.id),
      layoutPrimitiveVar(token, deviceId),
    ]),
  );
}
