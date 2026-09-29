"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Button,
  canAddRole,
  renameGroup,
  renameOpenRoleGroup,
  toggleRoleGroup,
  type TypeStep,
  type TypeSystem,
} from "@blueprint/ui";
import { RoleGroupEditor } from "./RoleGroupEditor";
import { RolePresetBar } from "./RolePresetBar";
import { useDeviceRoleActions } from "./use-device-role-actions";
import type { TypographySystemActions } from "./use-typography-system";
import styles from "./typography-workspace.module.css";

interface RoleGroupsPanelProps {
  system: TypeSystem;
  actions: TypographySystemActions;
  /** The device being previewed; size and spacing edits are its own. */
  deviceId: string;
  /** Largest first, as the step list shows them. */
  steps: TypeStep[];
  /** On a phone the groups are an accordion, moved with buttons. */
  isPhone: boolean;
  /** Which groups are open in the accordion, kept by the studio so a sheet
      that closes and reopens finds them as it left them. */
  openGroups: string[];
  onOpenGroupsChange: (ids: string[]) => void;
}

/** The inspector's Groups tab: role presets, the groups, and Add group. */
export function RoleGroupsPanel({
  system,
  actions,
  deviceId,
  steps,
  isPhone,
  openGroups,
  onOpenGroupsChange,
}: RoleGroupsPanelProps) {
  const deviceActions = useDeviceRoleActions(actions, deviceId);

  /* A drag has to start past a few pixels, or every click on a handle is a
     zero-length drag and the button never reports a press. The keyboard
     sensor is what replaces the up and down buttons. */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <>
      <RolePresetBar system={system} onApply={actions.updateSystem} />
      {/* Groups are an order somebody arranges, so they are dragged rather
          than stepped. The keyboard sensor is the whole of the keyboard
          story: focus a handle, space to lift, arrows to move, space to
          drop. */}
      <DndContext
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragEnd={({ active, over }) => {
          if (!over) return;
          actions.reorderGroups(String(active.id), String(over.id));
        }}
      >
        <SortableContext
          items={system.groups.map((group) => group.id)}
          strategy={verticalListSortingStrategy}
        >
          {system.groups.map((group, index) => (
            <RoleGroupEditor
              key={group.id}
              {...deviceActions}
              accordion={
                isPhone
                  ? {
                      isOpen: openGroups.includes(group.id),
                      onToggle: () =>
                        onOpenGroupsChange(
                          toggleRoleGroup(openGroups, group.id),
                        ),
                      onMoveUp:
                        index > 0
                          ? () => actions.shiftGroup(group.id, -1)
                          : undefined,
                      onMoveDown:
                        index < system.groups.length - 1
                          ? () => actions.shiftGroup(group.id, 1)
                          : undefined,
                    }
                  : undefined
              }
              canAddRole={canAddRole(system, group)}
              deviceId={deviceId}
              fonts={system.fonts}
              group={group}
              roles={system.roles.filter((role) => role.groupId === group.id)}
              steps={steps}
              system={system}
              onAddRole={() => actions.addRole(group)}
              onIndexingChange={(indexing) =>
                actions.updateGroup(group.id, { indexing })
              }
              onAutoLineHeightRatioChange={(autoLineHeightRatio) =>
                actions.updateGroup(group.id, { autoLineHeightRatio })
              }
              onLabelChange={(label) =>
                actions.updateGroup(group.id, { label })
              }
              onLabelCommit={() => {
                /* Renaming re-slugs the id the open state is kept by, so the
                   new id is worked out the way the rename will, and the group
                   stays open under it. */
                const renamed = renameGroup(system, group.id, group.label)
                  .groups[index]?.id;
                if (renamed && renamed !== group.id) {
                  onOpenGroupsChange(
                    renameOpenRoleGroup(openGroups, group.id, renamed),
                  );
                }
                actions.renameGroupById(group.id, group.label);
              }}
              onRemove={() => actions.removeGroup(group.id)}
              onRoleChange={actions.updateRole}
              onRoleRemove={actions.removeRole}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className={styles.settingGroup}>
        <Button
          className={styles.addEntryButton}
          scheme="primary"
          size="medium"
          variant="contained"
          onClick={actions.addGroup}
        >
          Add group
        </Button>
      </div>
    </>
  );
}
