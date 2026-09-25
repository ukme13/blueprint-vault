import { layoutVariableName } from "./layout-tokens";

/**
 * What each component radius falls back to when a scope does not set it.
 *
 * The Uses rows always set a value, so this is for a page that has not got
 * one: a use that was deleted, or CSS written before the use existed. It is
 * the base radius the control used before it had its own.
 */
export const COMPONENT_RADIUS_FALLBACKS: Readonly<Record<string, string>> = {
  "radius-button": "element",
  "radius-input": "element",
  "radius-chip": "inner",
  "radius-surface": "container",
};

/**
 * A component's corner as CSS, with its fallback: `radius-button` becomes
 * `var(--radius-button, var(--radius-element))`.
 *
 * The fallback sits in the `var()` and not in a root declaration on purpose.
 * A custom property declared on `:root` as `var(--radius-element)` resolves
 * there, and a preview that sets its own element radius would inherit the
 * root's px instead.
 */
export function componentRadiusCss(id: string): string {
  const fallback = COMPONENT_RADIUS_FALLBACKS[id];
  const own = `var(${layoutVariableName(id)}`;
  return fallback ? `${own}, var(--radius-${fallback}))` : `${own})`;
}
