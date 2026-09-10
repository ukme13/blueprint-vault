import { formatLength } from "./export";
import { findGoogleFont } from "./google-fonts";
import { defaultPreviewDevices, type PreviewDevice } from "./preview-devices";
import { generateTypeSteps } from "./scale";
import {
  resolveLineHeight,
  resolveRoleSizePx,
  type TypeSystem,
} from "./system";
import type { TypeScaleUnit } from "./types";

/**
 * Export for the merged model.
 *
 * `:root` is the narrowest preview frame. Each wider frame that actually
 * changes a role token gets its own `@media (min-width: widthPx)` block.
 * Identical consecutive frames are skipped, so a tablet that already matches
 * desktop does not earn an empty query at 1120px, and a project whose frames
 * all resolve equal still ships no media query at all.
 *
 * Queries use the frame's `widthPx`, not `system.breakpointPx`. Bound roles
 * resolve against that frame's ratio so the file matches the preview.
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
  letterSpacingPx: number;
}

function stackedPreviewDevices(
  system: TypeSystem,
  devices: readonly PreviewDevice[] | undefined,
): PreviewDevice[] {
  const list =
    devices && devices.length > 0
      ? devices
      : defaultPreviewDevices(system.ratio);
  return [...list].sort((a, b) => {
    if (a.widthPx !== b.widthPx) return a.widthPx - b.widthPx;
    return a.id.localeCompare(b.id);
  });
}

function roleViewportTokens(
  system: TypeSystem,
  device: PreviewDevice,
): RoleViewportTokens[] {
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    device.ratio,
    system.stepCount,
  );
  return system.roles.map((role) => {
    const fontSizePx = resolveRoleSizePx(system, steps, role, device.id);
    return {
      tokenId: typeTokenId(role.id),
      fontSizePx,
      lineHeight: resolveLineHeight(role, fontSizePx, device.id)
        .computedLineHeightRatio,
      letterSpacingPx: role.letterSpacingPx,
    };
  });
}

/**
 * Role size, line-height and letter-spacing for one frame.
 *
 * When `previous` is set, only tokens that changed from the last emitted
 * cascade are written. Letter-spacing is still shared, so override blocks
 * normally omit it.
 */
function emitRoleTokens(
  roles: RoleViewportTokens[],
  unit: TypeScaleUnit,
  indent: string,
  previous: RoleViewportTokens[] | null,
): string[] {
  const prevById = previous
    ? new Map(previous.map((role) => [role.tokenId, role]))
    : null;
  return roles.flatMap((role) => {
    const prev = prevById?.get(role.tokenId);
    const lines: string[] = [];
    if (!prev || prev.fontSizePx !== role.fontSizePx) {
      lines.push(
        `${indent}--font-${role.tokenId}-size: ${formatLength(role.fontSizePx, unit)};`,
      );
    }
    if (!prev || prev.lineHeight !== role.lineHeight) {
      lines.push(
        `${indent}--font-${role.tokenId}-line-height: ${role.lineHeight};`,
      );
    }
    if (!prev || prev.letterSpacingPx !== role.letterSpacingPx) {
      lines.push(
        `${indent}--font-${role.tokenId}-letter-spacing: ${formatLength(role.letterSpacingPx, unit)};`,
      );
    }
    return lines;
  });
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
  const frames = stackedPreviewDevices(system, devices);
  const base = frames[0]!;
  const baseRoles = roleViewportTokens(system, base);

  const lines = [
    ...googleFontNotice(system),
    open,
    ...sharedLines(system, unit),
    ...emitRoleTokens(baseRoles, unit, "  ", null),
    "}",
  ];

  let previous = baseRoles;
  for (const device of frames.slice(1)) {
    const current = roleViewportTokens(system, device);
    const changed = emitRoleTokens(current, unit, "    ", previous);
    if (changed.length === 0) {
      previous = current;
      continue;
    }
    lines.push(
      "",
      `@media (min-width: ${device.widthPx}px) {`,
      `  ${open}`,
      ...changed,
      "  }",
      "}",
    );
    previous = current;
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
