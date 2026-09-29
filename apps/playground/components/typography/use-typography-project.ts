"use client";

import { useEffect, useState } from "react";
import type { PaletteProjectData } from "@blueprint/ui";
import {
  readStoredPalette,
  readStoredProject,
  writeStoredProject,
  type TypographyProject,
} from "./typography-project";

/**
 * The typography project, read from storage once on load and written back on
 * every change, with the palette half of the same workspace beside it.
 */
export function useTypographyProject() {
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

  useEffect(() => {
    if (!hasLoaded || !project) return;
    writeStoredProject(project);
  }, [hasLoaded, project]);

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
