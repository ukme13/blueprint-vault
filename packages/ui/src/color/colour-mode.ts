/**
 * Where an application keeps the colour mode somebody chose.
 *
 * One key, shared by every Blueprint application. The studio and the
 * documentation are two windows onto the same design system, and somebody who
 * sets dark in one and finds the other light has been told they are two
 * products. They are not.
 *
 * A module with no "use client" and no imports, because a client provider and
 * a server layout both read this: the provider to restore the choice, the
 * layout to inline it into the script that applies the mode before first
 * paint. A constant imported from a client module into a server component
 * arrives as a client reference rather than a string, so this cannot live
 * beside the hook that uses it.
 */
export const COLOUR_MODE_STORAGE_KEY = "blueprint.colour-mode.v1";

/**
 * The script that applies the saved mode before React exists.
 *
 * Returned as a string because both applications inline the same one, and a
 * second copy is a second thing to keep in step with the key above. It runs
 * `beforeInteractive`, which is the only strategy Next injects into the
 * initial HTML: without it the page paints in the system's scheme and snaps to
 * the saved mode a frame later.
 *
 * `system` and an unset key both leave the attribute off, which is what
 * Astryx's `Theme` does for that mode too — `color-scheme` falls back to
 * `light dark` and the browser decides.
 */
export function applySavedColourModeScript(): string {
  return `(function(){try{var m=localStorage.getItem(${JSON.stringify(
    COLOUR_MODE_STORAGE_KEY,
  )});if(m==="light"||m==="dark"){document.documentElement.setAttribute("data-theme",m)}}catch(e){}})()`;
}
