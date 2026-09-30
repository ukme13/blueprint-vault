"use client";

import { useEffect, useState } from "react";
import type { StudioViewMemory } from "@blueprint/ui";
import { readStudioViewMemory } from "./studio-view-memory";

/**
 * Each studio's last view, for the sidebar's links.
 *
 * Read after mount and again whenever the route changes, which is when a
 * studio has just been left: reading in render would differ between the
 * server's page and the browser's, and hydrate wrongly. Empty on the first
 * render, so those links start as plain paths.
 */
export function useStudioViewMemory(pathname: string): StudioViewMemory {
  const [memory, setMemory] = useState<StudioViewMemory>({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemory(readStudioViewMemory());
  }, [pathname]);
  return memory;
}
