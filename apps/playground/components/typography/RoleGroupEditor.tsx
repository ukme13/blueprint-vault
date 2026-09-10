"use client";

import {
  AlignVerticalSpaceAround,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  MAX_LINE_HEIGHT_RATIO,
  MIN_LINE_HEIGHT_RATIO,
  TYPE_INDEXING_LABELS,
  hybridPresetsFromTypeSteps,
  type TypeFont,
  type TypeGroup,
  type TypeIndexing,
  type TypeRole,
  type TypeStep,
  type TypeSystem,
  type LineHeightConfig,
} from "@blueprint/ui";
import { RoleRow } from "./RoleRow";
import styles from "./typography-workspace.module.css";

export interface RoleGroupEditorProps {
  group: TypeGroup;
  /** This group's roles, already resolved and filtered by the caller. */
  roles: TypeRole[];
  fonts: TypeFont[];
  system: TypeSystem;
  /** Which preview device the size field is editing. */
  deviceId: string;
  /** Largest first, matching the step list the canvas renders. */
  steps: TypeStep[];
  canAddRole: boolean;
  onAddRole: () => void;
  onRemove: () => void;
  onLabelChange: (label: string) => void;
  onLabelCommit: () => void;
  onIndexingChange: (indexing: TypeIndexing) => void;
  onAutoLineHeightRatioChange: (ratio: number) => void;
  onRoleChange: (id: string, patch: Partial<TypeRole>) => void;
  onBindStep: (id: string, stepOffset: number) => void;
  onUnlinkSize: (id: string, fontSizePx: number) => void;
  onLineHeightOverride: (id: string, lineHeight: LineHeightConfig) => void;
  onLineHeightRelink: (id: string) => void;
  onLetterSpacingOverride: (id: string, letterSpacingPx: number) => void;
  onLetterSpacingRelink: (id: string) => void;
  onRoleRemove: (id: string) => void;
}

/** One group of roles in the inspector: its header, its meta, and its rows. */
export function RoleGroupEditor({
  group,
  roles,
  fonts,
  system,
  deviceId,
  steps,
  canAddRole,
  onAddRole,
  onRemove,
  onLabelChange,
  onLabelCommit,
  onIndexingChange,
  onAutoLineHeightRatioChange,
  onRoleChange,
  onBindStep,
  onUnlinkSize,
  onLineHeightOverride,
  onLineHeightRelink,
  onLetterSpacingOverride,
  onLetterSpacingRelink,
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
  const sizePresets = hybridPresetsFromTypeSteps(steps);

  return (
    <div
      ref={setNodeRef}
      aria-label={group.label}
      className={`${styles.settingGroup} flex flex-col gap-3 rounded-lg border border-border-default bg-surface-raised p-4`}
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

        <div className={styles.roleGroupMeta}>
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
          {/* Beside the name: the ratio `auto` line height uses for every
              role in this group. */}
          <NumberInput
            isLabelHidden
            isWheelEnabled={false}
            label={`${group.id} auto line height`}
            max={MAX_LINE_HEIGHT_RATIO}
            min={MIN_LINE_HEIGHT_RATIO}
            startIcon={AlignVerticalSpaceAround}
            step={0.1}
            value={group.autoLineHeightRatio}
            onChange={onAutoLineHeightRatioChange}
          />
          {/* How this group's roles are numbered, a property of the name
              next to it. */}
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

        <div className={styles.roleGroupActions}>
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
            <RoleRow
              key={role.id}
              deviceId={deviceId}
              fonts={fonts}
              role={role}
              sizePresets={sizePresets}
              steps={steps}
              system={system}
              onBindStep={onBindStep}
              onLineHeightOverride={onLineHeightOverride}
              onLineHeightRelink={onLineHeightRelink}
              onLetterSpacingOverride={onLetterSpacingOverride}
              onLetterSpacingRelink={onLetterSpacingRelink}
              onRoleChange={onRoleChange}
              onRoleRemove={onRoleRemove}
              onUnlinkSize={onUnlinkSize}
            />
          ))}
        </div>
      )}
    </div>
  );
}
