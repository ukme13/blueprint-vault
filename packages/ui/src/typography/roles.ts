import type { SemanticRole } from "./types";

/**
 * Semantic HTML element for each type role.
 *
 * Tokens control presentation; elements keep meaning and accessibility. Defined
 * once here so every preview template agrees, rather than each one inventing its
 * own mapping.
 *
 * `heading` maps to `h2`, not `h1`: only `display` is the page title, and a
 * preview that emits two `h1`s misrepresents the document outline it is meant to
 * be demonstrating.
 */
export const ROLE_ELEMENTS: Record<SemanticRole, string> = {
  display: "h1",
  heading: "h2",
  title: "h3",
  body: "p",
  label: "label",
  caption: "small",
};

/** The semantic element a role should render as. */
export function elementForRole(role: SemanticRole): string {
  return ROLE_ELEMENTS[role];
}
