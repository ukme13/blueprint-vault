"use client";

import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  formatLength,
  TYPE_INDEXING_LABELS,
  type TypeFont,
  type TypeGroup,
  type TypeIndexing,
  type TypeRole,
  type TypeScaleUnit,
  type TypeStep,
  resolveLineHeight,
  type LineHeightConfig,
} from "@blueprint/ui";
import { LineHeightInput } from "./LineHeightInput";
import styles from "./typography-workspace.module.css";

/** Sentinel for a role that carries its own size rather than following a step. */
const CUSTOM_STEP = "custom";

export interface RoleGroupEditorProps {
  group: TypeGroup;
  /** Position among its siblings, which is what the move buttons act on. */
  index: number;
  groupCount: number;
  /** This group's roles, already resolved and filtered by the caller. */
  roles: TypeRole[];
  fonts: TypeFont[];
  /** Largest first, matching the step list the canvas renders. */
  steps: TypeStep[];
  unit: TypeScaleUnit;
  canAddRole: boolean;
  onMove: (direction: -1 | 1) => void;
  onAddRole: () => void;
  onRemove: () => void;
  onLabelChange: (label: string) => void;
  onLabelCommit: () => void;
  onIndexingChange: (indexing: TypeIndexing) => void;
  onRoleChange: (id: string, patch: Partial<TypeRole>) => void;
  onRoleValueChange: (
    id: string,
    patch: Partial<{ lineHeight: LineHeightConfig; letterSpacingPx: number }>,
  ) => void;
  onRoleRemove: (id: string) => void;
}

/** One group of roles in the inspector: its header, its meta, and its rows. */
export function RoleGroupEditor({
  group,
  index,
  groupCount,
  roles,
  fonts,
  steps,
  unit,
  canAddRole,
  onMove,
  onAddRole,
  onRemove,
  onLabelChange,
  onLabelCommit,
  onIndexingChange,
  onRoleChange,
  onRoleValueChange,
  onRoleRemove,
}: RoleGroupEditorProps) {
  return (
    <div aria-label={group.label} className={styles.settingGroup} role="group">
      <header className={styles.roleGroupHeader}>
        <div className={styles.roleGroupActions}>
          <Button
            aria-label={`Move ${group.label} up`}
            disabled={index === 0}
            scheme="neutral"
            size="xs"
            variant="text"
            onClick={() => onMove(-1)}
          >
            ↑
          </Button>
          <Button
            aria-label={`Move ${group.label} down`}
            disabled={index === groupCount - 1}
            scheme="neutral"
            size="xs"
            variant="text"
            onClick={() => onMove(1)}
          >
            ↓
          </Button>
          <Button
            disabled={!canAddRole}
            scheme="neutral"
            size="xs"
            variant="text"
            onClick={onAddRole}
          >
            Add
          </Button>
          <Button
            aria-label={`Remove ${group.label} group`}
            scheme="neutral"
            size="xs"
            variant="text"
            onClick={onRemove}
          >
            Remove group
          </Button>
        </div>
      </header>

      <div className={styles.roleGroupMeta}>
        <TextInput
          label={`${group.id} name`}
          isLabelHidden
          value={group.label}
          /* Typing changes the label only. Renaming re-slugs the group id,
             which is this row's React key, so doing it per keystroke remounted
             the field and dropped focus after one character. It also renamed
             every role in the group on each letter typed. */
          onChange={onLabelChange}
          onBlur={onLabelCommit}
          /* Enter blurs rather than renaming directly, so both paths commit
             through the same handler. */
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        <Selector
          label={`${group.id} indexing`}
          isLabelHidden
          options={(["number", "size"] as TypeIndexing[]).map((mode) => ({
            label: TYPE_INDEXING_LABELS[mode],
            value: mode,
          }))}
          value={group.indexing}
          onChange={(value) => onIndexingChange(value as TypeIndexing)}
        />
      </div>

      {roles.length === 0 ? (
        <p className={styles.roleGroupEmpty}>No roles yet.</p>
      ) : (
        <div className={styles.roleTable}>
          {/* Column headers once per group, so each role is one readable row
              instead of repeating its own name on every control. */}
          <div className={styles.roleTableHead} aria-hidden="true">
            <span>Role</span>
            <span>Size</span>
            <span>Font</span>
            <span>Weight</span>
            <span>Line height</span>
            <span>Spacing</span>
            <span />
          </div>

          {roles.map((role) => (
            <div key={role.id} className={styles.roleTableRow}>
              <span className={styles.roleSettingLabel}>{role.id}</span>

              {/* Value first, preset second — the same shape as binding a
                  variable in Figma. Type any size, or pick a step off the
                  ramp. */}
              <div className={styles.sizeCell}>
                <NumberInput
                  isLabelHidden
                  label={`${role.id} size`}
                  min={1}
                  max={400}
                  units="px"
                  value={role.desktop.fontSizePx}
                  onChange={(value) =>
                    /* Typing a size unlinks the role from the ramp, so changing
                       the ratio never overwrites a number someone set
                       deliberately. */
                    onRoleChange(role.id, {
                      stepOffset: null,
                      sameAsRoleId: null,
                      desktop: { ...role.desktop, fontSizePx: value },
                      mobile: { ...role.mobile, fontSizePx: value },
                    })
                  }
                />
                <Selector
                  label={`${role.id} step`}
                  isLabelHidden
                  options={[
                    { label: "Custom", value: CUSTOM_STEP },
                    ...steps.map((step) => ({
                      label: `${step.offset >= 0 ? "+" : ""}${step.offset} · ${formatLength(step.fontSizePx, unit)}`,
                      value: String(step.offset),
                    })),
                  ]}
                  value={
                    role.stepOffset === null
                      ? CUSTOM_STEP
                      : String(role.stepOffset)
                  }
                  onChange={(value) =>
                    onRoleChange(
                      role.id,
                      value === CUSTOM_STEP
                        ? { stepOffset: null, sameAsRoleId: null }
                        : { stepOffset: Number(value), sameAsRoleId: null },
                    )
                  }
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
                onChange={(value) =>
                  onRoleChange(role.id, { fontWeight: value })
                }
              />
              <LineHeightInput
                label={`${role.id} line height`}
                config={role.desktop.lineHeight}
                computedPx={
                  resolveLineHeight(role).computedLineHeightPx
                }
                onChange={(lineHeight) =>
                  onRoleValueChange(role.id, { lineHeight })
                }
              />
              <NumberInput
                isLabelHidden
                label={`${role.id} letter spacing`}
                min={-2}
                max={2}
                step={0.05}
                units="px"
                value={role.desktop.letterSpacingPx}
                onChange={(value) =>
                  onRoleValueChange(role.id, { letterSpacingPx: value })
                }
              />
              <Button
                aria-label={`Remove ${role.id}`}
                scheme="neutral"
                size="xs"
                variant="text"
                onClick={() => onRoleRemove(role.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
