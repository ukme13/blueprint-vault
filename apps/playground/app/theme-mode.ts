/**
 * Where the studio's colour-mode choice is kept.
 *
 * A module of its own, with no "use client" and no imports, because two very
 * different files read this key. The provider is a client component; the root
 * layout is a server component that inlines the key into a script. A constant
 * imported from a client module into a server component arrives as a client
 * reference rather than a string, so the key has to live somewhere neither
 * side owns.
 *
 * Only the key. The mode's type, its values and the resolution of `system`
 * live in `@blueprint/ui`, next to the `ColourMode` they resolve to — a
 * choice with a third state, and the semantic layer that has values for two,
 * belong beside each other.
 */
export const THEME_MODE_STORAGE_KEY = "blueprint.colour-mode.v1";
