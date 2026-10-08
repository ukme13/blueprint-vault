"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import {
  Button,
  HybridTokenizedInput,
  hybridPresetsFromTypeSteps,
  hybridValueFromStepOffset,
  canRemoveRole,
  canonicalSizeDeviceId,
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
import { ConfirmDialog } from "../ConfirmDialog";
import styles from "./typography-workspace.module.css";
import { SheetSelector } from "../SheetSelector";
import { usePickerSheet } from "../picker-sheet";

export interface RoleRowProps {
  role: TypeRole;
  fonts: TypeFont[];
  system: TypeSystem;
  deviceId: string;
  steps: TypeStep[];
  sizePresets: ReturnType<typeof hybridPresetsFromTypeSteps>;
  /** Just added by Add role: plays an entrance and scrolls into view. */
  justAdded?: boolean;
  onBindStep: (id: string, stepOffset: number) => void;
  onSetSize: (id: string, fontSizePx: number) => void;
  onSizeRelink: (id: string) => void;
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
  justAdded = false,
  onBindStep,
  onSetSize,
  onSizeRelink,
  onLineHeightOverride,
  onLineHeightRelink,
  onLetterSpacingOverride,
  onLetterSpacingRelink,
  onRoleChange,
  onRoleRemove,
}: RoleRowProps) {
  const pickerSheet = usePickerSheet();
  const rowRef = useRef<HTMLDivElement>(null);
  /* Removing a role asks first: its token may already be in use. */
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    /* On a wide panel the row is `display: contents` and has no box of its
       own, so it is the first cell, the role's name, that gets scrolled to. */
    const target = rowRef.current?.firstElementChild;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    target?.scrollIntoView({
      block: "nearest",
      behavior: reduce.matches ? "auto" : "smooth",
    });
  }, [justAdded]);
  const isDesktop = canonicalSizeDeviceId(deviceId) === "desktop";
  const sizeUnlinked = isRoleUnlinkedOnDevice(role, deviceId);
  /* A size typed on Desktop is the shared one, not an override. */
  const sizeOverride = sizeUnlinked && !isDesktop;
  const lineHeightUnlinked = isLineHeightUnlinkedOnDevice(role, deviceId);
  const lineHeight = lineHeightConfigOnDevice(role, deviceId);
  /* The ✕ on line height: an override clears back to the shared value; a
     typed shared value, on Desktop where it is set, clears back to auto. A
     frame that only follows the shared value has nothing of its own to
     clear. */
  const lineHeightClearable =
    lineHeightUnlinked || (isDesktop && lineHeight.mode !== "auto");
  const letterSpacingUnlinked = isLetterSpacingUnlinkedOnDevice(role, deviceId);
  const fontSizePx = resolveRoleSizePx(system, steps, role, deviceId);

  return (
    <div
      ref={rowRef}
      className={
        justAdded
          ? `${styles.roleTableRow} ${styles.roleTableRowAdded}`
          : styles.roleTableRow
      }
      data-just-added={justAdded || undefined}
    >
      <span className={styles.roleSettingLabel}>{role.id}</span>

      {/* A bound chip is a step on the ramp; typing a size unlinks it. */}
      {/* Each field carries a caption the phone shows, where the table's
          column headers are hidden and a role is a small card of fields. On a
          wider panel the caption is hidden and the header names the column. */}
      <div
        className={`${styles.sizeCell} ${sizeOverride ? styles.sizeUnlinked : ""}`}
      >
        <span aria-hidden="true" className={styles.roleFieldCaption}>
          Size
        </span>
        <HybridTokenizedInput
          decimals={0}
          isLabelHidden
          label={`${role.id} size`}
          max={400}
          min={1}
          popoverTitle="Type steps"
          presets={sizePresets}
          sheet={pickerSheet}
          searchPlaceholder="Search steps..."
          step={1}
          value={hybridValueFromStepOffset(
            sizeUnlinked ? null : role.stepOffset,
            fontSizePx,
          )}
          valueSuffix="px"
          /* Typed on Tablet or Phone, a size is that frame's override:
             accent, with a ✕ back to what it followed. Typed on Desktop it is
             the shared size, in the default colour, and has nothing to go back
             to — unless a project from before kept its step beside it. */
          isOverride={sizeOverride}
          onRelink={
            sizeOverride
              ? () => onSizeRelink(role.id)
              : sizeUnlinked && role.stepOffset !== null
                ? () => onBindStep(role.id, role.stepOffset!)
                : undefined
          }
          onChange={(next) => {
            if (next.isPreset && next.presetId !== undefined) {
              onBindStep(role.id, Number(next.presetId));
              return;
            }
            onSetSize(role.id, next.value);
          }}
        />
      </div>

      <div className={styles.fontCell}>
        <span aria-hidden="true" className={styles.roleFieldCaption}>
          Font
        </span>
        <SheetSelector
          label={`${role.id} font`}
          isLabelHidden
          options={fonts.map((font) => ({
            label: font.name,
            value: font.id,
          }))}
          value={role.fontId}
          onChange={(value) => onRoleChange(role.id, { fontId: value })}
        />
      </div>
      <div className={styles.weightCell}>
        <span aria-hidden="true" className={styles.roleFieldCaption}>
          Weight
        </span>
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
      </div>
      <div
        className={`${styles.lineHeightCell} ${lineHeightUnlinked ? styles.lineHeightUnlinked : ""}`}
        data-unlinked={lineHeightUnlinked ? "true" : undefined}
      >
        <span aria-hidden="true" className={styles.roleFieldCaption}>
          Line height
        </span>
        <LineHeightInput
          hasClear={lineHeightClearable}
          label={`${role.id} line height`}
          config={lineHeight}
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
        className={`${styles.spacingCell} ${letterSpacingUnlinked ? styles.letterSpacingUnlinked : ""}`}
        data-unlinked={letterSpacingUnlinked ? "true" : undefined}
      >
        <span aria-hidden="true" className={styles.roleFieldCaption}>
          Spacing
        </span>
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
        className={styles.removeRoleButton}
        disabled={!canRemoveRole(system, role.id)}
        scheme="neutral"
        size="icon"
        title={
          canRemoveRole(system, role.id)
            ? undefined
            : "A core group keeps at least one role."
        }
        variant="text"
        onClick={() => setIsConfirmingRemove(true)}
      >
        {/* The icon is the label. `size="icon"` takes children as the
            glyph and the accessible name from aria-label, so the row
            keeps naming which role it removes. */}
        <X aria-hidden="true" />
      </Button>
      {/* Closed, it renders a hidden dialog, so it takes no grid cell. */}
      <ConfirmDialog
        actionLabel="Delete role"
        description="This removes the role and its token. Any components using it will need to be updated."
        isOpen={isConfirmingRemove}
        title={`Delete role "${role.id}"?`}
        onAction={() => {
          setIsConfirmingRemove(false);
          onRoleRemove(role.id);
        }}
        onCancel={() => setIsConfirmingRemove(false)}
      />
    </div>
  );
}
