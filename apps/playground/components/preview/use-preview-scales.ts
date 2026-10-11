import { useMemo, type CSSProperties } from "react";
import {
  defaultElevationScale,
  defaultLayoutTokens,
  defaultRadiusScale,
  defaultSpacingScale,
  elevationCssVariables,
  generatePalettes,
  layoutBindingVariables,
  layoutCssVariablesForDevice,
  radiusCssVariables,
  resolveElevation,
  resolveRadius,
  resolveSemanticColorMap,
  resolveSpacing,
  semanticCssVariables,
  spacingCssVariables,
  typeCssVariablesForDevice,
  typeRoleRowGroups,
  type ColourMode,
  type LayoutBindings,
  type PreviewDevice,
  type SemanticToken,
  type TypeSystem,
  type WorkspaceProject,
} from "@blueprint/ui";

const EMPTY_PALETTES: never[] = [];

/**
 * Everything the preview page and its panel are drawn from the project's
 * scales: the CSS variables of the frame being looked at, the colour each
 * token resolves to, and the lists the panel's token pickers offer.
 *
 * One place, so the page and the panel read the same values from the same
 * memos, and the component that renders them has none of this to hold.
 */
export function usePreviewScales({
  project,
  tokens,
  mode,
  seen,
  frame,
  devices,
  system,
  unit,
  remRootPx,
  layoutBindings,
}: {
  project: WorkspaceProject | null;
  tokens: SemanticToken[];
  mode: ColourMode;
  /** How a colour is seen: the colour-vision simulation, or as it is. */
  seen: (hex: string) => string;
  frame: PreviewDevice;
  devices: readonly PreviewDevice[];
  system: TypeSystem;
  unit: Parameters<typeof typeCssVariablesForDevice>[2];
  remRootPx: Parameters<typeof typeCssVariablesForDevice>[3];
  /** Which use each space on the page reads, where it is not its own. */
  layoutBindings: LayoutBindings;
}) {
  const palettes = useMemo(
    () =>
      project?.palette ? generatePalettes(project.palette) : EMPTY_PALETTES,
    [project],
  );

  const tokenColors = useMemo(
    () => resolveSemanticColorMap(tokens, mode, palettes, seen),
    [tokens, mode, palettes, seen],
  );

  const variables = useMemo(
    (): CSSProperties =>
      ({
        ...semanticCssVariables(tokens, mode, palettes, seen),
        ...spacingCssVariables(project?.spacing ?? defaultSpacingScale()),
        ...radiusCssVariables(project?.radius ?? defaultRadiusScale()),
        ...elevationCssVariables(
          project?.elevation ?? defaultElevationScale(),
          palettes,
          mode,
        ),
        ...layoutCssVariablesForDevice(
          project?.layout ?? defaultLayoutTokens(),
          frame.id,
        ),
        ...layoutBindingVariables(
          project?.layout ?? defaultLayoutTokens(),
          layoutBindings,
          frame.id,
        ),
        ...typeCssVariablesForDevice(system, frame, unit, remRootPx, devices),
      }) as CSSProperties,
    [
      tokens,
      mode,
      seen,
      palettes,
      project?.spacing,
      project?.radius,
      project?.elevation,
      project?.layout,
      layoutBindings,
      frame,
      system,
      unit,
      remRootPx,
      devices,
    ],
  );

  /* What the panel's token lists are drawn from: the project's own scales. */
  const spacingTokens = useMemo(
    () => resolveSpacing(project?.spacing ?? defaultSpacingScale()),
    [project?.spacing],
  );
  const radiusTokens = useMemo(
    () => resolveRadius(project?.radius ?? defaultRadiusScale()),
    [project?.radius],
  );
  const elevationLevels = useMemo(
    () =>
      resolveElevation(
        project?.elevation ?? defaultElevationScale(),
        palettes,
        mode,
      ),
    [project?.elevation, palettes, mode],
  );
  const roleGroups = useMemo(
    () => typeRoleRowGroups(system, frame.id),
    [system, frame.id],
  );

  return {
    tokenColors,
    variables,
    spacingTokens,
    radiusTokens,
    elevationLevels,
    roleGroups,
  };
}
