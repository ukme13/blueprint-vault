"use client";

import { useState } from "react";
import {
  emptyWorkspace,
  updatePreviewDevice,
  useWorkspaceStore,
  withPreviewDevices,
  type HybridTokenizedValue,
} from "@blueprint/ui";
import type { TypographyProject } from "./typography-project";

/**
 * Each device's ratio field: which ones hold a typed number rather than a
 * preset, and the change that stores a ratio on the workspace's device. The
 * desktop's ratio is also the system's own, so it is mirrored there.
 */
export function useDeviceRatios(
  patchProject: (
    updater: (current: TypographyProject) => TypographyProject,
  ) => void,
) {
  const workspace = useWorkspaceStore();
  const [detachedRatios, setDetachedRatios] = useState<
    Record<string, number | null>
  >({});

  const onRatioChange = (id: string, next: HybridTokenizedValue) => {
    setDetachedRatios((current) => ({
      ...current,
      [id]: next.isPreset ? null : next.value,
    }));
    workspace.update((current) =>
      withPreviewDevices(
        current,
        updatePreviewDevice((current ?? emptyWorkspace()).previewDevices, id, {
          ratio: next.value,
        }),
      ),
    );
    if (id === "desktop") {
      patchProject((current) => ({
        ...current,
        system: { ...current.system, ratio: next.value },
      }));
    }
  };

  /**
   * Puts the desktop's ratio back on the workspace's device, for an undo or a
   * redo: the system holds it too, and the two must not part.
   */
  const syncDesktopRatio = (ratio: number) =>
    workspace.update((current) =>
      withPreviewDevices(
        current,
        updatePreviewDevice(
          (current ?? emptyWorkspace()).previewDevices,
          "desktop",
          { ratio },
        ),
      ),
    );

  return { detachedRatios, onRatioChange, syncDesktopRatio };
}
