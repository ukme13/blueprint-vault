"use client";

import { Lock, X } from "lucide-react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import {
  Button,
  MAX_PREVIEW_WIDTH_PX,
  MIN_PREVIEW_WIDTH_PX,
  addExtraDesktop,
  canAddExtraDesktop,
  emptyWorkspace,
  isRequiredPreviewDevice,
  removePreviewDevice,
  sortPreviewDevicesLargestFirst,
  updatePreviewDevice,
  useWorkspaceStore,
  withPreviewDevices,
  type PreviewDevice,
} from "@blueprint/ui";
import styles from "./workspace-settings.module.css";

/** Preview frames for the open workspace. Opened from the studio rail. */
export function WorkspaceSettingsDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const workspace = useWorkspaceStore();
  const project = workspace.project ?? emptyWorkspace();
  const devices = project.previewDevices;

  const patchDevices = (
    updater: (current: PreviewDevice[]) => PreviewDevice[],
  ) => {
    workspace.update((current) =>
      withPreviewDevices(
        current,
        updater((current ?? emptyWorkspace()).previewDevices),
      ),
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      purpose="info"
      width={420}
      onOpenChange={onOpenChange}
    >
      <Layout
        header={
          <DialogHeader
            subtitle="Phone, tablet and desktop stay. Typography and layout uses read these widths."
            title="Workspace settings"
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={6}>
              <PreviewFrames
                devices={devices}
                onAdd={() => patchDevices(addExtraDesktop)}
                onRemove={(id) =>
                  patchDevices((current) => removePreviewDevice(current, id))
                }
                onWidthChange={(id, widthPx) =>
                  patchDevices((current) =>
                    updatePreviewDevice(current, id, { widthPx }),
                  )
                }
              />
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}

function PreviewFrames({
  devices,
  onAdd,
  onRemove,
  onWidthChange,
}: {
  devices: readonly PreviewDevice[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onWidthChange: (id: string, widthPx: number) => void;
}) {
  return (
    <section className={styles.group} aria-label="Preview frames">
      <h2>Preview frames</h2>
      <p className={styles.hint}>
        Phone, tablet and desktop stay. Add up to two more desktop sizes.
      </p>
      <div className={styles.deviceList}>
        <div className={styles.deviceTableHead} aria-hidden="true">
          <span>Device</span>
          <span>Width</span>
          <span />
        </div>
        {sortPreviewDevicesLargestFirst(devices).map((device) => {
          const required = isRequiredPreviewDevice(device.id);
          return (
            <div key={device.id} className={styles.deviceRow}>
              <span className={styles.deviceName}>{device.name}</span>
              <NumberInput
                isIntegerOnly
                isLabelHidden
                label={`${device.name} width`}
                max={MAX_PREVIEW_WIDTH_PX}
                min={MIN_PREVIEW_WIDTH_PX}
                units="px"
                value={device.widthPx}
                onChange={(widthPx) => onWidthChange(device.id, widthPx)}
              />
              {required ? (
                <Tooltip content={`${device.name} stays in the preview`}>
                  <span
                    aria-label={`${device.name} cannot be removed`}
                    className={styles.deviceLock}
                    role="img"
                  >
                    <Lock aria-hidden="true" className="size-4" />
                  </span>
                </Tooltip>
              ) : (
                <Button
                  aria-label={`Remove ${device.name}`}
                  scheme="neutral"
                  size="icon"
                  variant="outlined"
                  onClick={() => onRemove(device.id)}
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Button
        disabled={!canAddExtraDesktop(devices)}
        scheme="primary"
        size="medium"
        variant="contained"
        onClick={onAdd}
      >
        Add desktop
      </Button>
    </section>
  );
}
