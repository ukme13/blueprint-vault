"use client";

import { X } from "lucide-react";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import {
  Button,
  HybridTokenizedInput,
  hybridPresetsFromTypeSteps,
  hybridValueFromStepOffset,
  isRoleUnlinkedOnDevice,
  isLineHeightUnlinkedOnDevice,
  isLetterSpacingUnlinkedOnDevice,
  letterSpacingPxOnDevice,
  lineHeightConfigOnDevice,
  resolveLineHeight,
  resolveRoleSizePx,
  type TypeFont,
  type TypeRole,
  type TypeStep,
  type TypeSystem,
  type LineHeightConfig,
} from "@blueprint/ui";
import { LineHeightInput } from "./LineHeightInput";
import styles from "./typography-workspace.module.css";

export interface RoleRowProps {
  role: TypeRole;
  fonts: TypeFont[];
  system: TypeSystem;
  deviceId: string;
  steps: TypeStep[];
  sizePresets: ReturnType<typeof hybridPresetsFromTypeSteps>;
  onBindStep: (id: string, stepOffset: number) => void;
  onUnlinkSize: (id: string, fontSizePx: number) => void;
  onLineHeightOverride: (id: string, lineHeight: LineHeightConfig) => void;
  onLineHeightRelink: (id: string) => void;
  onLetterSpacingOverride: (id: string, letterSpacingPx: number) => void;
  onLetterSpacingRelink: (id: string) => void;
  onRoleChange: (id: string, patch: Partial<TypeRole>) => void;
  onRoleRemove: (id: string) => void;
}

export function RoleRow({
  role,
  fonts,
  system,
  deviceId,
  steps,
  sizePresets,
  onBindStep,
  onUnlinkSize,
  onLineHeightOverride,
  onLineHeightRelink,
  onLetterSpacingOverride,
  onLetterSpacingRelink,
  onRoleChange,
  onRoleRemove,
}: RoleRowProps) {
  const sizeUnlinked = isRoleUnlinkedOnDevice(role, deviceId);
  const lineHeightUnlinked = isLineHeightUnlinkedOnDevice(role, deviceId);
  const letterSpacingUnlinked = isLetterSpacingUnlinkedOnDevice(role, deviceId);
  const fontSizePx = resolveRoleSizePx(system, steps, role, deviceId);

  return (
    <div className={styles.roleTableRow}>
      <span className={styles.roleSettingLabel}>{role.id}</span>

      {/* A bound chip is a step on the ramp; typing a size unlinks it. */}
      <div className={styles.sizeCell}>
        <HybridTokenizedInput
          decimals={0}
          isLabelHidden
          label={`${role.id} size`}
          max={400}
          min={1}
          popoverTitle="Type steps"
          presets={sizePresets}
          searchPlaceholder="Search steps..."
          step={1}
          value={hybridValueFromStepOffset(
            sizeUnlinked ? null : role.stepOffset,
            fontSizePx,
          )}
          valueSuffix="px"
          onChange={(next) => {
            if (next.isPreset && next.presetId !== undefined) {
              onBindStep(role.id, Number(next.presetId));
              return;
            }
            onUnlinkSize(role.id, next.value);
          }}
        />
      </div>

      <Selector
        label={`${role.id} font`}
        isLabelHidden
        options={fonts.map((font) => ({
          label: font.name,
          value: font.id,
        }))}
        value={role.fontId}
        onChange={(value) => onRoleChange(role.id, { fontId: value })}
      />
      <NumberInput
        isIntegerOnly
        isLabelHidden
        label={`${role.id} font weight`}
        min={100}
        max={900}
        step={100}
        value={role.fontWeight}
        onChange={(value) => onRoleChange(role.id, { fontWeight: value })}
      />
      <div
        className={lineHeightUnlinked ? styles.lineHeightUnlinked : undefined}
        data-unlinked={lineHeightUnlinked ? "true" : undefined}
      >
        <LineHeightInput
          label={`${role.id} line height`}
          config={lineHeightConfigOnDevice(role, deviceId)}
          computedPx={
            resolveLineHeight(role, fontSizePx, deviceId, system)
              .computedLineHeightPx
          }
          onChange={(lineHeight) => onLineHeightOverride(role.id, lineHeight)}
          onRelink={() => {
            if (lineHeightUnlinked) {
              onLineHeightRelink(role.id);
              return;
            }
            onRoleChange(role.id, { lineHeight: { mode: "auto" } });
          }}
        />
      </div>
      <div
        className={
          letterSpacingUnlinked ? styles.letterSpacingUnlinked : undefined
        }
        data-unlinked={letterSpacingUnlinked ? "true" : undefined}
      >
        <NumberInput
          hasClear={letterSpacingUnlinked}
          isLabelHidden
          label={`${role.id} letter spacing`}
          min={-2}
          max={2}
          step={0.05}
          units="px"
          value={letterSpacingPxOnDevice(role, deviceId)}
          onChange={(value: number | null) => {
            if (value === null || Number.isNaN(value)) {
              onLetterSpacingRelink(role.id);
              return;
            }
            onLetterSpacingOverride(role.id, value);
          }}
        />
      </div>
      <Button
        aria-label={`Remove ${role.id}`}
        /* Down from the icon size's 36px to match the inputs beside
           it. `cn` here is a plain join rather than tailwind-merge,
           so the CVA class is still on the element and only source
           order decides — hence the important suffix. */
        className="h-8! w-8! [&_svg]:size-4!"
        scheme="neutral"
        size="icon"
        variant="outlined"
        onClick={() => onRoleRemove(role.id)}
      >
        {/* The icon is the label. `size="icon"` takes children as the
            glyph and the accessible name from aria-label, so the row
            keeps naming which role it removes. */}
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}
