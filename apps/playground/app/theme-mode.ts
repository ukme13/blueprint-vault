/**
 * Where the studio's colour-mode choice is kept.
 *
 * A re-export, and a module of its own with no "use client", because the root
 * layout is a server component that inlines this into a script. The key itself
 * lives in @blueprint/ui: the studio and the documentation are two windows onto
 * one design system, and somebody who sets dark in one and finds the other
 * light has been told they are two products.
 */
export {
  COLOUR_MODE_STORAGE_KEY as THEME_MODE_STORAGE_KEY,
  applySavedColourModeScript,
} from "@blueprint/ui";
