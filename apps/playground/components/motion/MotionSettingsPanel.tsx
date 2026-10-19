"use client";

import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import styles from "./motion-studio.module.css";

const MIN_PX = 300;
const MAX_PX = 560;

/** The settings panel's width, remembered, between its bounds. */
export function useMotionSettingsPanel() {
  return useResizable({
    autoSaveId: "blueprint-motion-settings",
    defaultSize: 360,
    minSizePx: MIN_PX,
    maxSizePx: MAX_PX,
  });
}

/**
 * The edge between the stage and the settings. The panel is on the right, so
 * the arrows are reversed: Left widens it. Home and End go to the bounds.
 */
export function MotionSettingsResizeHandle({
  panel,
}: {
  panel: ReturnType<typeof useMotionSettingsPanel>;
}) {
  return (
    <ResizeHandle
      className={styles.resizeHandle}
      direction="horizontal"
      hasDivider
      isReversed
      label="Resize motion settings"
      pillPlacement="center"
      resizable={panel.props}
      onKeyDown={(event) => {
        const next = {
          ArrowLeft: panel.size + 10,
          ArrowRight: panel.size - 10,
          Home: MIN_PX,
          End: MAX_PX,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        panel.resize(next);
      }}
    />
  );
}
