import { useState } from "react";
import {
  defaultSpacingPreviewSettings,
  withSpacingPreview,
  type SpacingPreviewSettings,
  type SpacingSlot,
  type WorkspaceStore,
} from "@blueprint/ui";

/**
 * How the spacing preview is being looked at, shared by the canvas that
 * draws it and the inspector's step list that sets it: the saved settings,
 * and the slot a click on a step sets — the one last touched.
 */
export interface SpacingView {
  preview: SpacingPreviewSettings;
  /** Saved straight to the workspace: a view setting, never an undo step. */
  onPreviewChange: (patch: Partial<SpacingPreviewSettings>) => void;
  activeSlot: SpacingSlot;
  onActiveSlotChange: (slot: SpacingSlot) => void;
}

/** The spacing view, bound to the workspace store and the studio's state. */
export function useSpacingView(store: WorkspaceStore): SpacingView {
  const [activeSlot, setActiveSlot] = useState<SpacingSlot>("inset");
  return {
    preview: store.project?.spacingPreview ?? defaultSpacingPreviewSettings(),
    onPreviewChange: (patch) =>
      store.update((current) => withSpacingPreview(current, patch)),
    activeSlot,
    onActiveSlotChange: setActiveSlot,
  };
}
