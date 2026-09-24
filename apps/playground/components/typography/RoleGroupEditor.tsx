"use client";

import {
  AlignVerticalSpaceAround,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NumberInput } from "@astryxdesign/core/NumberInput";
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
import { ConfirmDialog } from "../ConfirmDialog";
import { RoleRow } from "./RoleRow";
import styles from "./typography-workspace.module.css";
import { SheetSelector } from "../SheetSelector";

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
  /**
   * On a phone, where the groups are an accordion: whether this one is open,
   * and moving it by a step, since a drag inside a scrolling sheet fights
   * the sheet. Absent, the group is always open and reorders by drag.
   */
  accordion?: {
    isOpen: boolean;
    onToggle: () => void;
    /** Absent for the first group. */
    onMoveUp?: () => void;
    /** Absent for the last group. */
    onMoveDown?: () => void;
  };
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
  accordion,
}: RoleGroupEditorProps) {
  const isOpen = accordion ? accordion.isOpen : true;
  /* On a phone, removing a group asks first: the trash sits among fields a
     thumb is tapping, and a group takes its roles with it. */
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const bodyId = `role-group-${group.id}`;
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
      {accordion && (
        <div className={styles.roleGroupSummary}>
          <button
            aria-controls={bodyId}
            aria-expanded={isOpen}
            className={styles.roleGroupToggle}
            type="button"
            onClick={accordion.onToggle}
          >
            <ChevronDown
              aria-hidden="true"
              className={styles.roleGroupChevron}
              data-open={isOpen || undefined}
            />
            <span className={styles.roleGroupName}>{group.label}</span>
            <span className={styles.roleGroupCount}>
              {roles.length} {roles.length === 1 ? "role" : "roles"}
            </span>
          </button>
          <Button
            aria-label={`Move ${group.label} up`}
            className="h-8! w-8! [&_svg]:size-4!"
            disabled={!accordion.onMoveUp}
            scheme="neutral"
            size="icon"
            variant="text"
            onClick={accordion.onMoveUp}
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Move ${group.label} down`}
            className="h-8! w-8! [&_svg]:size-4!"
            disabled={!accordion.onMoveDown}
            scheme="neutral"
            size="icon"
            variant="text"
            onClick={accordion.onMoveDown}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
        </div>
      )}

      {isOpen && (
        <div className={styles.roleGroupBody} id={bodyId}>
          <div className={styles.roleGroupHeader}>
            {!accordion && (
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
            )}

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
              <SheetSelector
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
              {/* On a phone, Add role is the full-width button under the
                  roles instead. */}
              {!accordion && (
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
              )}
              <Button
                aria-label={`Remove ${group.label} group`}
                className="h-8! w-8! [&_svg]:size-4!"
                scheme="neutral"
                size="icon"
                variant="outlined"
                onClick={
                  accordion ? () => setIsConfirmingRemove(true) : onRemove
                }
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

          {accordion && (
            <Button
              className="w-full"
              disabled={!canAddRole}
              leftIcon={<Plus aria-hidden="true" />}
              scheme="neutral"
              size="medium"
              variant="outlined"
              onClick={onAddRole}
            >
              Add role
            </Button>
          )}
        </div>
      )}

      {accordion && (
        <ConfirmDialog
          actionLabel="Delete group"
          description={
            roles.length === 0
              ? "This group has no roles."
              : `Its ${roles.length} ${roles.length === 1 ? "role goes" : "roles go"} with it.`
          }
          isOpen={isConfirmingRemove}
          title={`Delete group "${group.label}"?`}
          onAction={() => {
            setIsConfirmingRemove(false);
            onRemove();
          }}
          onCancel={() => setIsConfirmingRemove(false)}
        />
      )}
    </div>
  );
}
