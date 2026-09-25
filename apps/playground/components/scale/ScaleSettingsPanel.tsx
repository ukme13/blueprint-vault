"use client";

import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import styles from "./scale-workspace.module.css";

const MIN_PX = 300;
const MAX_PX = 560;

/** The settings panel's width, remembered, between its bounds. */
export function useScaleSettingsPanel() {
  return useResizable({
    autoSaveId: "blueprint-scale-settings",
    defaultSize: 350,
    minSizePx: MIN_PX,
    maxSizePx: MAX_PX,
  });
}

/**
 * The edge between canvas and settings. The panel is on the right, so the
 * arrows are reversed: Left widens it. Home and End go to the bounds.
 */
export function ScaleSettingsResizeHandle({
  panel,
}: {
  panel: ReturnType<typeof useScaleSettingsPanel>;
}) {
  return (
    <ResizeHandle
      className={styles.resizeHandle}
      direction="horizontal"
      hasDivider
      isReversed
      label="Resize scale settings"
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
