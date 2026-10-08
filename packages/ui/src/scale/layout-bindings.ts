import {
  layoutPrimitiveVar,
  layoutVariableName,
  type LayoutToken,
} from "./layout-tokens";

/**
 * Which layout use each space of a page is bound to, as Figma binds a
 * variable to a field.
 *
 * Keyed by the slot, the use the page reads for that space (`inset-container`
 * is the page's side padding), and holding the id of the use it reads
 * instead. A slot with no entry reads its own use, so an empty record is the
 * page as the Uses table sets it. A binding changes what one space reads and
 * never the use it was taken from: the table is not edited by it.
 */
export type LayoutBindings = Readonly<Record<string, string>>;

/**
 * The use a slot is bound to. Its own when it has no binding, when the use
 * it names has since gone, or when that use is a different kind of thing,
 * since a padding cannot be given a radius.
 */
export function boundLayoutToken(
  layout: readonly LayoutToken[],
  bindings: LayoutBindings,
  slotId: string,
): LayoutToken | undefined {
  const own = layout.find((token) => token.id === slotId);
  const bound = layout.find((token) => token.id === bindings[slotId]);
  return bound && own && bound.kind === own.kind ? bound : own;
}

/** The bindings with this slot bound to a use; binding it to itself clears it. */
export function bindLayoutSlot(
  bindings: LayoutBindings,
  slotId: string,
  tokenId: string,
): LayoutBindings {
  if (tokenId === slotId) {
    const rest = { ...bindings };
    delete rest[slotId];
    return rest;
  }
  return { ...bindings, [slotId]: tokenId };
}

/**
 * The custom properties a page needs for its bound slots on one frame: each
 * slot's variable set to the size of the use it is bound to.
 *
 * Only the slots that are bound. The size is the bound use's own, not what
 * that use is itself bound to, so two slots bound to each other cannot loop.
 * A bound use with no size on the frame leaves its slot as it was.
 */
export function layoutBindingVariables(
  layout: readonly LayoutToken[],
  bindings: LayoutBindings,
  deviceId: string,
): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const slotId of Object.keys(bindings)) {
    const bound = boundLayoutToken(layout, bindings, slotId);
    if (!bound || bound.id === slotId || !bound.byDevice[deviceId]) continue;
    variables[layoutVariableName(slotId)] = layoutPrimitiveVar(bound, deviceId);
  }
  return variables;
}
