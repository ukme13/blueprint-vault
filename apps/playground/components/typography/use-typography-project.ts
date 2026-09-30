"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore, type PaletteProjectData } from "@blueprint/ui";
import {
  readStoredPalette,
  readStoredProject,
  withStoredTypography,
  type TypographyProject,
} from "./typography-project";
import { editKeyOf } from "./typography-edit-keys";

/**
 * The typography project, read from storage once on load and written back on
 * every change, with the palette half of the same workspace beside it.
 *
 * The studio holds its own copy of its slice, so it is written through the
 * workspace store, which records an edit of the type system in the history
 * every studio shares, and read again when the store puts a document back: an
 * undo changed the stored one under this copy.
 */
export function useTypographyProject() {
  const { update, revision } = useWorkspaceStore();
  const [project, setProject] = useState<TypographyProject | null>(null);
  const [palette, setPalette] = useState<PaletteProjectData | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    /* Reading localStorage must happen in an effect: a useState initializer
       would run during SSR, where window does not exist, and desync
       hydration. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProject(readStoredProject());
    setPalette(readStoredPalette());
    setHasLoaded(true);
  }, []);

  /* Set when this copy was just read back from storage: what it holds is what
     is stored, so writing it again would only be a chance to put a stale copy
     over a document an undo has put back since. */
  const justRead = useRef(false);

  useEffect(() => {
    if (!hasLoaded || !project) return;
    if (justRead.current) {
      justRead.current = false;
      return;
    }
    /* The control that made the edit, so a drag is one undo step. The same
       content written again is no step: the store compares by value. */
    update((current) => withStoredTypography(current, project), {
      key: editKeyOf(project.system),
    });
  }, [hasLoaded, project, update]);

  /* An undo or redo put a stored document back: read this slice again. */
  const seenRevision = useRef(revision);
  useEffect(() => {
    if (revision === seenRevision.current) return;
    seenRevision.current = revision;
    justRead.current = true;
    setProject(readStoredProject());
  }, [revision]);

  /* Unit, specimen and template sit beside the system rather than in it, so
     they do not go through useTypographySystem. The same guard it keeps. */
  const patchProject = (
    updater: (current: TypographyProject) => TypographyProject,
  ) => setProject((current) => (current ? updater(current) : current));

  const setPreference = (patch: Partial<Omit<TypographyProject, "system">>) =>
    patchProject((current) => ({ ...current, ...patch }));

  /** Reads the stored project again, after something else wrote it. */
  const reload = () => setProject(readStoredProject());

  return {
    project,
    setProject,
    palette,
    hasLoaded,
    patchProject,
    setPreference,
    reload,
  };
}
