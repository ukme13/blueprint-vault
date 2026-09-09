"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { PreviewDevice } from "@blueprint/ui";

const DEVICE_ICONS = {
  phone: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
} as const;

interface PreviewDeviceBarProps {
  activeId: string;
  devices: readonly PreviewDevice[];
  onChange: (id: string) => void;
}

export function PreviewDeviceBar({
  activeId,
  devices,
  onChange,
}: PreviewDeviceBarProps) {
  return (
    <nav aria-label="Preview devices" className="flex items-center gap-1">
      {devices.map((device) => {
        const Icon = DEVICE_ICONS[device.kind];
        const isActive = device.id === activeId;
        const tooltip = `${device.name} · ${device.widthPx}px`;
        return (
          <IconButton
            key={device.id}
            aria-pressed={isActive}
            icon={<Icon aria-hidden className="size-3.5" />}
            label={device.name}
            size="sm"
            tooltip={tooltip}
            variant={isActive ? "secondary" : "ghost"}
            onClick={() => onChange(device.id)}
          />
        );
      })}
    </nav>
  );
}
