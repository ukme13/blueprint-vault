import type { PreviewDevice } from "../typography/preview-devices";
import { resolveTemplateSlot } from "../typography/role-rows";
import { generateTypeSteps } from "../typography/scale";
import {
  resolveLineHeight,
  resolveRoleSizePx,
  rolesInGroup,
  type TypeRole,
  type TypeSystem,
} from "../typography/system";

/** The button role group: `button-md`, `button-sm`, `button-xs`. */
const BUTTON_GROUP_ID = "button";

/** A button's border, on each of its two block edges. */
export const CONTROL_BORDER_PX = 1;

/** What a button on the preview measures, by the size its label is set in. */
export interface ButtonHeight {
  /** The size's suffix on its role, `md` for `button-md`; null with no button roles. */
  size: string | null;
  heightPx: number;
}

/**
 * The height of a control whose padding is the block inset.
 *
 * A line of its label, the inset above and below it, and the border on both
 * edges: the sum the preview's buttons make, because they are given no height
 * of their own.
 */
export function controlHeightPx(
  lineHeightPx: number,
  insetYPx: number,
  borderPx: number = CONTROL_BORDER_PX,
): number {
  return Math.round(lineHeightPx + 2 * insetYPx + 2 * borderPx);
}

/**
 * How tall each button size comes out on one preview frame.
 *
 * Read from the type system as the export reads it: the role's size on that
 * frame's ramp, and the line height that size resolves to. A system with no
 * button group has the one height its buttons really have, since the preview
 * seeds them in the label slot's role; empty only when there is no role at
 * all, so a caller shows no hint rather than a wrong one.
 */
export function buttonHeights(
  system: TypeSystem,
  device: PreviewDevice,
  insetYPx: number,
): ButtonHeight[] {
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    device.ratio,
    system.stepCount,
  );
  const heightOf = (role: TypeRole, size: string | null): ButtonHeight => {
    const fontSizePx = resolveRoleSizePx(system, steps, role, device.id);
    const { computedLineHeightPx } = resolveLineHeight(
      role,
      fontSizePx,
      device.id,
      system,
    );
    return { size, heightPx: controlHeightPx(computedLineHeightPx, insetYPx) };
  };

  const roles = rolesInGroup(system, BUTTON_GROUP_ID);
  if (roles.length > 0) {
    return roles.map((role) => heightOf(role, role.id.replace(/^button-/, "")));
  }
  /* Where the preview seeds a button's label when there is no button role. */
  const fallback = resolveTemplateSlot(system, "label");
  return fallback ? [heightOf(fallback, null)] : [];
}

/** The size the hint speaks of: the standard button. */
const STANDARD_BUTTON_SIZE = "md";

/**
 * The standard button's height as a hint under the block inset: `Button: ~38px (md)`.
 *
 * One size, not the ramp: the hint is a gauge for the inset, and the medium
 * button is the one the others are read against. The first size when there is
 * no `md`, and no suffix for the fallback role, which has none. Null when
 * there are no heights.
 */
export function describeButtonHeights(
  heights: readonly ButtonHeight[],
): string | null {
  const standard =
    heights.find((each) => each.size === STANDARD_BUTTON_SIZE) ?? heights[0];
  if (!standard) return null;
  return `Button: ~${standard.heightPx}px${standard.size ? ` (${standard.size})` : ""}`;
}
