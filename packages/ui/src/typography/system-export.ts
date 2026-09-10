import { formatLength, letterSpacingEm } from "./export";
import { fluidEmClamp, fluidLengthClamp, fluidUnitlessClamp } from "./fluid";
import { findGoogleFont } from "./google-fonts";
import {
  defaultPreviewDevices,
  sortPreviewDevicesByWidth,
  type PreviewDevice,
} from "./preview-devices";
import { generateTypeSteps } from "./scale";
import {
  letterSpacingEmSizePx,
  letterSpacingPxOnDevice,
  resolveLineHeight,
  resolveRoleSizePx,
  type TypeSystem,
} from "./system";
import type { TypeScaleUnit } from "./types";

/**
 * Export for the merged model.
 *
 * `:root` is the narrowest preview frame. Consecutive frames that differ
 * interpolate with `clamp()`, so a 500px layout is not stuck on the phone
 * size until 768. A later pair starts at `@media (min-width: that frame)`.
 * Identical consecutive frames are skipped, and a project whose frames all
 * resolve equal still ships no clamp and no media query.
 *
 * Queries and the `100vw` span use the frame's `widthPx`. Bound roles resolve
 * against that frame's ratio so the file matches the preview. Letter-spacing
 * is `em`: shared tracking uses the desktop size; a typed frame uses that
 * frame's size. Frames that differ interpolate like size and line-height.
 */

/**
 * A font or role id, as it is spelled in a variable name.
 *
 * Exported rather than private because the documentation names the same
 * variables beside each role, and a page that built `--font-h1-size` from its
 * own `toLowerCase` would be a second spelling of this rule — agreeing until
 * somebody names a role "Body Large" and the two disagree about the hyphen.
 * A developer copying a name off the page has to get the one in their file.
 */
export function typeTokenId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface RoleViewportTokens {
  tokenId: string;
  fontSizePx: number;
  lineHeight: number;
  letterSpacingEm: number;
}

interface FrameSnapshot {
  device: PreviewDevice;
  roles: RoleViewportTokens[];
}

function stackedPreviewDevices(
  system: TypeSystem,
  devices: readonly PreviewDevice[] | undefined,
): PreviewDevice[] {
  const list =
    devices && devices.length > 0
      ? devices
      : defaultPreviewDevices(system.ratio);
  return sortPreviewDevicesByWidth(list);
}

function roleViewportTokens(
  system: TypeSystem,
  device: PreviewDevice,
  desktopSizeByRoleId: ReadonlyMap<string, number>,
): RoleViewportTokens[] {
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    device.ratio,
    system.stepCount,
  );
  return system.roles.map((role) => {
    const fontSizePx = resolveRoleSizePx(system, steps, role, device.id);
    const trackingPx = letterSpacingPxOnDevice(role, device.id);
    const desktopSizePx = desktopSizeByRoleId.get(role.id) ?? fontSizePx;
    return {
      tokenId: typeTokenId(role.id),
      fontSizePx,
      lineHeight: resolveLineHeight(role, fontSizePx, device.id, system)
        .computedLineHeightRatio,
      letterSpacingEm: letterSpacingEm(
        trackingPx,
        letterSpacingEmSizePx(role, fontSizePx, desktopSizePx, device.id),
      ),
    };
  });
}

function indentFor(frameIndex: number): string {
  return frameIndex === 0 ? "  " : "    ";
}

/**
 * Write a size or line-height across the stacked frames.
 *
 * A pair that differs becomes a clamp starting on the earlier frame. A run
 * that never changes is a static token in `:root`.
 */
function emitFluidProperty(
  linesByFrame: string[][],
  widths: readonly number[],
  values: readonly number[],
  tokenId: string,
  name: string,
  clamp: (
    fromWidth: number,
    fromValue: number,
    toWidth: number,
    toValue: number,
  ) => string,
  formatStatic: (value: number) => string,
): void {
  const starts: number[] = [];
  for (let i = 0; i < values.length - 1; i += 1) {
    if (values[i] !== values[i + 1] && widths[i] !== widths[i + 1]) {
      starts.push(i);
    }
  }

  if (starts.length === 0) {
    linesByFrame[0]!.push(
      `${indentFor(0)}--font-${tokenId}-${name}: ${formatStatic(values[0]!)};`,
    );
    return;
  }

  if (starts[0] !== 0) {
    linesByFrame[0]!.push(
      `${indentFor(0)}--font-${tokenId}-${name}: ${formatStatic(values[0]!)};`,
    );
  }

  for (const i of starts) {
    const from = i;
    const to = i + 1;
    linesByFrame[from]!.push(
      `${indentFor(from)}--font-${tokenId}-${name}: ${clamp(
        widths[from]!,
        values[from]!,
        widths[to]!,
        values[to]!,
      )};`,
    );
  }
}

function fluidRoleLines(
  frames: FrameSnapshot[],
  unit: TypeScaleUnit,
): string[][] {
  const linesByFrame = frames.map((): string[] => []);
  const widths = frames.map((frame) => frame.device.widthPx);
  const first = frames[0]!;

  for (const role of first.roles) {
    const across = frames.map((frame) =>
      frame.roles.find((entry) => entry.tokenId === role.tokenId)!,
    );
    emitFluidProperty(
      linesByFrame,
      widths,
      across.map((entry) => entry.fontSizePx),
      role.tokenId,
      "size",
      (fromWidth, fromValue, toWidth, toValue) =>
        fluidLengthClamp(fromWidth, fromValue, toWidth, toValue, unit),
      (value) => formatLength(value, unit),
    );
    emitFluidProperty(
      linesByFrame,
      widths,
      across.map((entry) => entry.lineHeight),
      role.tokenId,
      "line-height",
      fluidUnitlessClamp,
      (value) => `${Number(value.toFixed(4))}`,
    );
    emitFluidProperty(
      linesByFrame,
      widths,
      across.map((entry) => entry.letterSpacingEm),
      role.tokenId,
      "letter-spacing",
      fluidEmClamp,
      (value) => `${Number(value.toFixed(4))}em`,
    );
  }

  return linesByFrame;
}

function sharedLines(system: TypeSystem, unit: TypeScaleUnit): string[] {
  const fonts = system.fonts.map(
    (font) =>
      `  --font-family-${typeTokenId(font.id)}: ${font.families
        .map((family) =>
          /^[a-zA-Z][a-zA-Z0-9-]*$/.test(family) ? family : `"${family}"`,
        )
        .join(", ")};`,
  );

  /* Step tokens are kept because the previous main-studio export emitted them.
     Dropping them would silently break anyone consuming --font-size-N.
     They stay on the canonical desktop ramp (`system.ratio`); per-frame
     ratio only changes how bound roles resolve inside each viewport. */
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    system.ratio,
    system.stepCount,
  ).map(
    (step) =>
      `  --font-size-${step.step}: ${formatLength(step.fontSizePx, unit)};`,
  );

  const perRole = system.roles.flatMap((role) => {
    const id = typeTokenId(role.id);
    return [
      `  --font-${id}-family: var(--font-family-${typeTokenId(role.fontId)});`,
      `  --font-${id}-weight: ${role.fontWeight};`,
      `  --font-${id}-transform: ${role.textTransform};`,
    ];
  });

  return [...fonts, ...steps, ...perRole];
}

/**
 * Google families the system names.
 *
 * Exported tokens can name a family but cannot load it, so the consuming app
 * has to. Listing them in a comment is the only way that requirement travels
 * with the tokens.
 */
function googleFontNotice(system: TypeSystem): string[] {
  const families = [
    ...new Set(
      system.fonts
        .flatMap((font) => font.families)
        .filter((family) => findGoogleFont(family) !== undefined),
    ),
  ].sort();

  if (families.length === 0) return [];
  return [
    "/* Loads from Google Fonts. These tokens name the families but do not",
    "   load them — the consuming app must:",
    ...families.map((family) => `     - ${family}`),
    "*/",
  ];
}

function body(
  system: TypeSystem,
  unit: TypeScaleUnit,
  open: string,
  devices?: readonly PreviewDevice[],
): string {
  const stacked = stackedPreviewDevices(system, devices);
  const desktop =
    stacked.find((device) => device.id === "desktop") ?? stacked.at(-1)!;
  const desktopSteps = generateTypeSteps(
    system.baseFontSizePx,
    desktop.ratio,
    system.stepCount,
  );
  const desktopSizeByRoleId = new Map(
    system.roles.map((role) => [
      role.id,
      resolveRoleSizePx(system, desktopSteps, role, desktop.id),
    ]),
  );
  const snapshots: FrameSnapshot[] = stacked.map((device) => ({
    device,
    roles: roleViewportTokens(system, device, desktopSizeByRoleId),
  }));
  const roleLines = fluidRoleLines(snapshots, unit);

  const lines = [
    ...googleFontNotice(system),
    open,
    ...sharedLines(system, unit),
    ...roleLines[0]!,
    "}",
  ];

  for (let i = 1; i < snapshots.length; i += 1) {
    const changed = roleLines[i]!;
    if (changed.length === 0) continue;
    lines.push(
      "",
      `@media (min-width: ${snapshots[i]!.device.widthPx}px) {`,
      `  ${open}`,
      ...changed,
      "  }",
      "}",
    );
  }

  return lines.join("\n");
}

export function formatTypeSystemCssExport(
  system: TypeSystem,
  unit: TypeScaleUnit = "rem",
  devices?: readonly PreviewDevice[],
): string {
  return body(system, unit, ":root {", devices);
}

export function formatTypeSystemTailwindExport(
  system: TypeSystem,
  unit: TypeScaleUnit = "rem",
  devices?: readonly PreviewDevice[],
): string {
  return body(system, unit, "@theme static {", devices);
}
