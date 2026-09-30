"use client";

import { useState } from "react";
import {
  emptyWorkspace,
  updatePreviewDevice,
  useWorkspaceStore,
  withPreviewDevices,
  type HybridTokenizedValue,
} from "@blueprint/ui";
import { tagEdit } from "./typography-edit-keys";
import type { TypographyProject } from "./typography-project";

/**
 * Each device's ratio field: which ones hold a typed number rather than a
 * preset, and the change that stores a ratio on the workspace's device. The
 * desktop's ratio is also the system's own, so it is mirrored there.
 *
 * The device and the system's mirror are written apart, the first now and the
 * second when the studio persists, so both carry one key: the store's history
 * joins them into a single undo step, and an undo puts both back.
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
    const key = `ratio:${id}`;
    setDetachedRatios((current) => ({
      ...current,
      [id]: next.isPreset ? null : next.value,
    }));
    workspace.update(
      (current) =>
        withPreviewDevices(
          current,
          updatePreviewDevice(
            (current ?? emptyWorkspace()).previewDevices,
            id,
            { ratio: next.value },
          ),
        ),
      { key },
    );
    if (id === "desktop") {
      patchProject((current) => {
        const system = { ...current.system, ratio: next.value };
        tagEdit(system, key);
        return { ...current, system };
      });
    }
  };

  return { detachedRatios, onRatioChange };
}
