"use client";

import { useMemo } from "react";
import type { LineHeightConfig } from "@blueprint/ui";
import type { TypographySystemActions } from "./use-typography-system";

/** A role's per-device edits, named as RoleGroupEditor takes them. */
export interface DeviceRoleActions {
  onBindStep: (id: string, stepOffset: number) => void;
  onSetSize: (id: string, fontSizePx: number) => void;
  onSizeRelink: (id: string) => void;
  onLineHeightOverride: (id: string, lineHeight: LineHeightConfig) => void;
  onLineHeightRelink: (id: string) => void;
  onLetterSpacingOverride: (id: string, letterSpacingPx: number) => void;
  onLetterSpacingRelink: (id: string) => void;
}

/**
 * The size, line-height and tracking edits bound to the device being
 * previewed: an edit made while looking at the phone is the phone's.
 */
export function useDeviceRoleActions(
  actions: TypographySystemActions,
  deviceId: string,
): DeviceRoleActions {
  return useMemo(
    () => ({
      onBindStep: (id, stepOffset) =>
        actions.bindRoleStep(id, deviceId, stepOffset),
      onSetSize: (id, fontSizePx) =>
        actions.setRoleSize(id, deviceId, fontSizePx),
      onSizeRelink: (id) => actions.relinkRoleSize(id, deviceId),
      onLineHeightOverride: (id, lineHeight) =>
        actions.setLineHeight(id, deviceId, lineHeight),
      onLineHeightRelink: (id) => actions.bindLineHeight(id, deviceId),
      onLetterSpacingOverride: (id, letterSpacingPx) =>
        actions.setLetterSpacing(id, deviceId, letterSpacingPx),
      onLetterSpacingRelink: (id) => actions.bindLetterSpacing(id, deviceId),
    }),
    [actions, deviceId],
  );
}
