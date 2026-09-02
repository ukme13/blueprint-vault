"use client";

import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  /** This group's roles, already resolved and filtered by the caller. */
  roles: TypeRole[];
  fonts: TypeFont[];
  /** Largest first, matching the step list the canvas renders. */
  steps: TypeStep[];
  unit: TypeScaleUnit;
  canAddRole: boolean;
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
  roles,
  fonts,
  steps,
  unit,
  canAddRole,
  onAddRole,
  onRemove,
  onLabelChange,
  onLabelCommit,
  onIndexingChange,
  onRoleChange,
  onRoleValueChange,
  onRoleRemove,
}: RoleGroupEditorProps) {
  /* The card is the sortable, and the handle is the only thing that starts a
     drag: the card is full of fields, and a press on one of them is somebody
     editing rather than dragging. */
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  return (
    <div
      ref={setNodeRef}
      aria-label={group.label}
      className={`${styles.settingGroup} flex flex-col gap-3 rounded-lg border border-border-base bg-neutral-850 p-4`}
      role="group"
      style={{
        /* Translate rather than Transform.

           `CSS.Transform` is translate plus scale, and the scale is measured
           against whatever the card is currently over. Cards here are as tall
           as the roles they hold, so dragging a short one onto a tall one
           stretched it to the height of the card it was passing. Translate
           moves it and leaves it its own size. */
        transform: CSS.Translate.toString(transform),
        transition,
        /* Lifted while it moves, so it reads as being carried over the others
           rather than swapping with them. */
        zIndex: isDragging ? 1 : undefined,
        opacity: isDragging ? 0.6 : undefined,
      }}
    >
      <div className={styles.roleGroupHeader}>
        <Button
          ref={setActivatorNodeRef}
          aria-label={`Reorder ${group.label} group`}
          className="h-8! w-6! cursor-grab [&_svg]:size-4!"
          scheme="neutral"
          size="icon"
          variant="text"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" />
        </Button>

        <div className="min-w-0 flex-1">
          <TextInput
            label={`${group.id} name`}
            isLabelHidden
            value={group.label}
            /* Typing changes the label only. Renaming re-slugs the group id,
               which is this row's React key, so doing it per keystroke
               remounted the field and dropped focus after one character. It
               also renamed every role in the group on each letter typed. */
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
        </div>

        {/* Beside the name rather than on a row of its own: it says how this
            group's roles are numbered, which is a property of the name next
            to it. Fixed width so the name keeps the space it gains. */}
        <div className="w-28 shrink-0">
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

        <Button
          aria-label={`Add a role to ${group.label}`}
          className="h-8! w-8! [&_svg]:size-4!"
          disabled={!canAddRole}
          scheme="neutral"
          size="icon"
          variant="outlined"
          onClick={onAddRole}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Remove ${group.label} group`}
          className="h-8! w-8! [&_svg]:size-4!"
          scheme="neutral"
          size="icon"
          variant="outlined"
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
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
                computedPx={resolveLineHeight(role).computedLineHeightPx}
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
          ))}
        </div>
      )}
    </div>
  );
}
