/**
 * Where the documentation's colour-mode choice is kept.
 *
 * A re-export, and a module of its own with no "use client", because the root
 * layout is a server component that inlines the script into its HTML. The key
 * and the script live in @blueprint/ui, shared with the studio, so the two
 * applications cannot disagree about where a person's preference is stored.
 */
export {
  COLOUR_MODE_STORAGE_KEY,
  applySavedColourModeScript,
} from "@blueprint/ui";
