import { studioHref, type StudioViewMemory } from "../studio-view";
import type { WorkspaceOrigin, WorkspaceTarget } from "./workspace-origin";

/** A studio's path without a trailing slash, as an origin names it. */
function bare(pathname: string): string {
  return pathname.replace(/(.)\/$/, "$1");
}

/** Where an undo or a redo takes the person, and how to get there. */
export interface UndoMove {
  href: string;
  /**
   * Another view of the studio that is already open, such as the Colour
   * studio's Semantics tab from its shade generator. Reached by telling the
   * studio, as a tab click does: a route change to the same path would change
   * the address and leave the tab where it was.
   */
  withinPage: boolean;
}

/**
 * Where an undo or a redo should take the person, or null to stay.
 *
 * To the place the edit was made, so what is reverted is on screen when it
 * happens, as Figma moves to what an undo changed. Staying put when they are
 * already there: on the studio's path and, if the origin names a view of it,
 * on that view. Otherwise the studio's own link: the view it was last left on,
 * unless the origin names one, which wins since that is where the control is.
 */
export function undoMove(
  origin: WorkspaceOrigin | null,
  here: { pathname: string; search: string },
  memory: StudioViewMemory,
): UndoMove | null {
  if (!origin) return null;
  const withinPage = bare(here.pathname) === origin.path;
  if (withinPage) {
    if (origin.query === undefined) return null;
    const have = new URLSearchParams(here.search);
    const named = new URLSearchParams(origin.query);
    if ([...named].every(([key, value]) => have.get(key) === value)) {
      return null;
    }
  }
  return {
    href:
      origin.query === undefined
        ? studioHref(memory, origin.path)
        : `${origin.path}?${origin.query}`,
    withinPage,
  };
}

/** An undo or a redo that has just been taken, and where its edit was made. */
export interface WorkspaceStep {
  direction: "undo" | "redo";
  origin: WorkspaceOrigin | null;
  /** What it changed, to flash; empty when the studio has nothing to point at. */
  targets: readonly WorkspaceTarget[];
  /** When it was taken, so a studio opened later can tell it is still fresh. */
  at: number;
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
