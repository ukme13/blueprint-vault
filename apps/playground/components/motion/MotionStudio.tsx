"use client";

import { useState, type CSSProperties } from "react";
import {
  Button,
  DEFAULT_WORKSPACE_NAME,
  defaultMotionScale,
  emptyWorkspace,
  useWorkspaceStore,
  type MotionSpeed,
} from "@blueprint/ui";
import { Sheet } from "../Sheet";
import { SystemExportDialog } from "../SystemExportDialog";
import { useIsPhone } from "../use-is-phone";
import { MotionInspector } from "./MotionInspector";
import {
  MotionSettingsResizeHandle,
  useMotionSettingsPanel,
} from "./MotionSettingsPanel";
import { MotionStage } from "./MotionStage";
import { MotionToolbar } from "./MotionToolbar";
import { useMotionHistory } from "./use-motion-history";
import styles from "./motion-studio.module.css";

/**
 * The Motion studio: the stage on the left, where real controls move on the
 * scale, and on the right the settings of the token being tuned. Undo, redo and
 * Export are the workspace's, as in every studio.
 *
 * What is chosen here (the token, the speed) is how the scale is looked at, not
 * part of it, so it is not saved and not undone.
 */
export function MotionStudio() {
  const store = useWorkspaceStore();
  const history = useMotionHistory(store);
  const isPhone = useIsPhone();
  const panel = useMotionSettingsPanel();
  const [speed, setSpeed] = useState<MotionSpeed>(1);
  const [replayKey, setReplayKey] = useState(0);
  const [selectedDurationId, setSelectedDurationId] = useState<string>();
  const [selectedEasingId, setSelectedEasingId] = useState<string>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const project = store.project;
  const scale = project?.motion ?? defaultMotionScale();

  const inspector = (
    <MotionInspector
      replayKey={replayKey}
      scale={scale}
      selectedDurationId={selectedDurationId}
      selectedEasingId={selectedEasingId}
      speed={speed}
      onChange={(next, editKey) => history.write(next, { editKey })}
      onSelectDuration={setSelectedDurationId}
      onSelectEasing={setSelectedEasingId}
    />
  );

  if (!store.hasLoaded) {
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className={styles.loadingPage}
        role="status"
      >
        Loading workspace…
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <span className={styles.headerActions}>
          <Button
            scheme="neutral"
            size="medium"
            variant="outlined"
            onClick={() => setIsExportOpen(true)}
          >
            Export
          </Button>
        </span>
      </header>

      <MotionToolbar
        history={history}
        speed={speed}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReplay={() => setReplayKey((key) => key + 1)}
        onSpeedChange={setSpeed}
      />

      <section
        className={styles.editor}
        style={{ "--inspector-width": `${panel.size}px` } as CSSProperties}
      >
        <MotionStage
          replayKey={replayKey}
          scale={scale}
          selectedDurationId={selectedDurationId}
          speed={speed}
          onSelectDuration={setSelectedDurationId}
        />
        <MotionSettingsResizeHandle panel={panel} />
        {!isPhone && <aside className={styles.inspector}>{inspector}</aside>}
      </section>

      {isPhone && (
        <Sheet
          isOpen={isSettingsOpen}
          label="Motion settings"
          padding="flush"
          onClose={() => setIsSettingsOpen(false)}
        >
          <aside className={styles.inspector}>{inspector}</aside>
        </Sheet>
      )}

      <SystemExportDialog
        isOpen={isExportOpen}
        workspace={{
          ...(project ?? emptyWorkspace()),
          name: project?.name ?? DEFAULT_WORKSPACE_NAME,
          motion: scale,
        }}
        onOpenChange={setIsExportOpen}
      />
    </div>
  );
}
