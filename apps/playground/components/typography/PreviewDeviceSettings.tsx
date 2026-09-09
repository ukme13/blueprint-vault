"use client";

import { Lock, X } from "lucide-react";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import {
  Button,
  HybridTokenizedInput,
  MAX_PREVIEW_WIDTH_PX,
  MAX_RATIO,
  MIN_PREVIEW_WIDTH_PX,
  MIN_RATIO,
  canAddExtraDesktop,
  isRequiredPreviewDevice,
  resolveHybridValue,
  type HybridTokenizedValue,
  type HybridTokenPreset,
  type PreviewDevice,
} from "@blueprint/ui";
import styles from "./typography-workspace.module.css";

interface PreviewDeviceSettingsProps {
  devices: readonly PreviewDevice[];
  presets: readonly HybridTokenPreset[];
  detachedRatios: Record<string, number | null>;
  onWidthChange: (id: string, widthPx: number) => void;
  onRatioChange: (id: string, next: HybridTokenizedValue) => void;
  onAddDesktop: () => void;
  onRemove: (id: string) => void;
}

function DeviceRow({
  device,
  presets,
  detachedRatio,
  onWidthChange,
  onRatioChange,
  onRemove,
}: {
  device: PreviewDevice;
  presets: readonly HybridTokenPreset[];
  detachedRatio: number | null;
  onWidthChange: (widthPx: number) => void;
  onRatioChange: (next: HybridTokenizedValue) => void;
  onRemove: () => void;
}) {
  const required = isRequiredPreviewDevice(device.id);
  return (
    <div className={styles.deviceRow}>
      <span className={styles.deviceName}>{device.name}</span>
      <NumberInput
        isIntegerOnly
        isLabelHidden
        label={`${device.name} width`}
        max={MAX_PREVIEW_WIDTH_PX}
        min={MIN_PREVIEW_WIDTH_PX}
        units="px"
        value={device.widthPx}
        onChange={onWidthChange}
      />
      <div className={styles.deviceRatio}>
        <HybridTokenizedInput
          decimals={3}
          isLabelHidden
          label={`${device.name} ratio`}
          max={MAX_RATIO}
          min={MIN_RATIO}
          popoverTitle="Modular Scale Presets"
          presets={presets}
          searchPlaceholder="Search scale presets..."
          step={0.001}
          value={resolveHybridValue(device.ratio, presets, detachedRatio)}
          onChange={onRatioChange}
        />
      </div>
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
          className="h-8! w-8! [&_svg]:size-4!"
          scheme="neutral"
          size="icon"
          variant="outlined"
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export function PreviewDeviceSettings({
  devices,
  presets,
  detachedRatios,
  onWidthChange,
  onRatioChange,
  onAddDesktop,
  onRemove,
}: PreviewDeviceSettingsProps) {
  return (
    <div className={styles.settingGroup}>
      <h2>Devices</h2>
      <p className={styles.deviceHint}>
        Phone, tablet and desktop stay. Add up to two more desktop sizes.
      </p>
      <div className={styles.deviceList}>
        <div className={styles.deviceTableHead} aria-hidden="true">
          <span>Device</span>
          <span>Size</span>
          <span>Ratio</span>
          <span />
        </div>
        {devices.map((device) => (
          <DeviceRow
            key={device.id}
            detachedRatio={detachedRatios[device.id] ?? null}
            device={device}
            presets={presets}
            onRatioChange={(next) => onRatioChange(device.id, next)}
            onRemove={() => onRemove(device.id)}
            onWidthChange={(widthPx) => onWidthChange(device.id, widthPx)}
          />
        ))}
      </div>
      <Button
        className={styles.addEntryButton}
        disabled={!canAddExtraDesktop(devices)}
        scheme="primary"
        size="medium"
        variant="contained"
        onClick={onAddDesktop}
      >
        Add desktop
      </Button>
    </div>
  );
}
