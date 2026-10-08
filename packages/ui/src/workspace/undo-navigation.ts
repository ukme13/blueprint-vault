import { studioHref, type StudioViewMemory } from "../studio-view";
import type { WorkspaceOrigin } from "./workspace-history";

/**
 * Where an undo or a redo should take the person, or null to stay.
 *
 * To the place the edit was made, so what is reverted is on screen when it
 * happens, as Figma moves to what an undo changed. Staying put when they are
 * already there: on the studio's path and, if the origin names a view of it,
 * on that view. Otherwise the studio's own link: the view it was last left on,
 * unless the origin names one, which wins since that is where the control is.
 */
export function undoDestination(
  origin: WorkspaceOrigin | null,
  here: { pathname: string; search: string },
  memory: StudioViewMemory,
): string | null {
  if (!origin) return null;
  const pathname = here.pathname.replace(/(.)\/$/, "$1");
  if (pathname === origin.path) {
    if (origin.query === undefined) return null;
    const have = new URLSearchParams(here.search);
    const named = new URLSearchParams(origin.query);
    const onIt = [...named].every(([key, value]) => have.get(key) === value);
    if (onIt) return null;
  }
  return origin.query === undefined
    ? studioHref(memory, origin.path)
    : `${origin.path}?${origin.query}`;
}
