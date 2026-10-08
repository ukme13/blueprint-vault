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

/** An undo or a redo that has just been taken, and where its edit was made. */
export interface WorkspaceStep {
  direction: "undo" | "redo";
  origin: WorkspaceOrigin | null;
}

const STUDIO_LABELS: Readonly<Record<string, string>> = {
  "/colour": "Colour",
  "/typography": "Typography",
  "/spacing": "Spacing",
  "/radius": "Radius",
  "/elevation": "Elevation",
  "/preview": "Preview",
};

/**
 * What to call the place an edit was made: the studio, or its Semantics tab,
 * which is the one view a person thinks of as a place of its own. Null for a
 * path the app does not know.
 */
export function originLabel(origin: WorkspaceOrigin): string | null {
  if (origin.path === "/colour" && origin.query === "view=semantics") {
    return "Semantics";
  }
  return STUDIO_LABELS[origin.path] ?? null;
}

/**
 * The line to show after an undo or a redo: what happened, and where.
 *
 * So a person taken to another studio or tab is told why the screen changed,
 * and one who stayed put is told what was taken back.
 */
export function stepMessage(step: WorkspaceStep): string {
  const verb = step.direction === "undo" ? "Undid" : "Redid";
  const label = step.origin ? originLabel(step.origin) : null;
  return label ? `${verb} edit in ${label}` : `${verb} the last edit`;
}
