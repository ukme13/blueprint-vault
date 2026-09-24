"use client";

import {
  HybridTokenizedInput,
  MAX_RATIO,
  MIN_RATIO,
  resolveHybridValue,
  sortPreviewDevicesLargestFirst,
  type HybridTokenizedValue,
  type HybridTokenPreset,
  type PreviewDevice,
} from "@blueprint/ui";
import styles from "./typography-workspace.module.css";
import { renderPickerSheet } from "../picker-sheet";
import { useIsPhone } from "../use-is-phone";

interface PreviewDeviceSettingsProps {
  devices: readonly PreviewDevice[];
  presets: readonly HybridTokenPreset[];
  detachedRatios: Record<string, number | null>;
  onRatioChange: (id: string, next: HybridTokenizedValue) => void;
}

export function PreviewDeviceSettings({
  devices,
  presets,
  detachedRatios,
  onRatioChange,
}: PreviewDeviceSettingsProps) {
  const isPhone = useIsPhone();
  return (
    <div className={styles.settingGroup}>
      <h2>Type ratios</h2>
      <p className={styles.deviceHint}>
        Each frame can follow a different modular scale. Widths live in
        workspace Settings.
      </p>
      <div className={styles.deviceList}>
        <div className={styles.deviceTableHead} aria-hidden="true">
          <span>Device</span>
          <span>Ratio</span>
        </div>
        {sortPreviewDevicesLargestFirst(devices).map((device) => (
          <div key={device.id} className={styles.deviceRow}>
            <span className={styles.deviceName}>{device.name}</span>
            <div className={styles.deviceRatio}>
              <HybridTokenizedInput
                decimals={3}
                isLabelHidden
                label={`${device.name} ratio`}
                max={MAX_RATIO}
                min={MIN_RATIO}
                popoverTitle="Modular Scale Presets"
                presets={presets}
                sheet={isPhone ? renderPickerSheet : undefined}
                searchPlaceholder="Search scale presets..."
                step={0.001}
                value={resolveHybridValue(
                  device.ratio,
                  presets,
                  detachedRatios[device.id] ?? null,
                )}
                onChange={(next) => onRatioChange(device.id, next)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
