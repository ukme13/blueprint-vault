import { useMemo, type Dispatch, type SetStateAction } from "react";
import {
  addFont,
  addGroup,
  addRole,
  moveGroup,
  removeFont,
  removeFontSlot,
  removeGroup,
  removeRole,
  renameFont,
  renameGroup,
  setGoogleFont,
  setLocalFont,
  updateGroup,
  updateRole,
  updateRoleValue,
  type TypeGroup,
  type TypeRole,
  type TypeSystem,
  type LineHeightConfig,
  type FontSlot,
} from "@blueprint/ui";
import type { TypographyProject } from "./typography-project";

export interface TypographySystemActions {
  updateSystem: (patch: Partial<TypeSystem>) => void;
  updateRole: (id: string, patch: Partial<TypeRole>) => void;
  updateRoleValue: (
    id: string,
    patch: Partial<{ lineHeight: LineHeightConfig; letterSpacingPx: number }>,
  ) => void;
  addRole: (group: TypeGroup) => void;
  removeRole: (id: string) => void;
  renameGroupById: (groupId: string, label: string) => void;
  updateGroup: (groupId: string, patch: Partial<TypeGroup>) => void;
  shiftGroup: (groupId: string, direction: -1 | 1) => void;
  addGroup: () => void;
  addFont: () => void;
  removeFont: (id: string) => void;
  /** Take one fallback out of a stack, closing the gap behind it. */
  removeFontSlot: (id: string, slot: FontSlot) => void;
  renameFont: (id: string, name: string) => void;
  setGoogleFont: (
    id: string,
    slot: FontSlot,
    family: string,
    generic?: string,
  ) => void;
  setLocalFont: (id: string, slot: FontSlot, family: string) => void;
  removeGroup: (groupId: string) => void;
}

/**
 * The edits a typography project allows, bound to its setter.
 *
 * The edits themselves live in @blueprint/ui, as TypeSystem -> TypeSystem
 * functions tested there. This binds them to the project state and answers, in
 * one place, whether there is a project to edit at all.
 *
 * Each action reads the system out of the updater rather than a closure, so the
 * returned object never has to change: it is built once, and a child taking
 * these as props is not re-rendered by the studio re-rendering.
 */
export function useTypographySystem(
  setProject: Dispatch<SetStateAction<TypographyProject | null>>,
): TypographySystemActions {
  return useMemo(() => {
    /* The one place that answers "is there a project?". Every action below is
       an edit to a system that exists; no project means no edit. */
    const editSystem = (edit: (system: TypeSystem) => TypeSystem) =>
      setProject((current) =>
        current ? { ...current, system: edit(current.system) } : current,
      );

    return {
      updateSystem: (patch) =>
        editSystem((system) => ({ ...system, ...patch })),
      updateRole: (id, patch) =>
        editSystem((system) => updateRole(system, id, patch)),
      updateRoleValue: (id, patch) =>
        editSystem((system) => updateRoleValue(system, id, patch)),
      addRole: (group) => editSystem((system) => addRole(system, group)),
      removeRole: (id) => editSystem((system) => removeRole(system, id)),
      /* Renaming a group renames its roles: ids are built from the group id, so
         the label and the exported token names would otherwise drift apart. */
      renameGroupById: (groupId, label) =>
        editSystem((system) => renameGroup(system, groupId, label)),
      updateGroup: (groupId, patch) =>
        editSystem((system) => updateGroup(system, groupId, patch)),
      shiftGroup: (groupId, direction) =>
        editSystem((system) => ({
          ...system,
          groups: moveGroup(system, groupId, direction),
        })),
      addGroup: () => editSystem(addGroup),
      addFont: () => editSystem(addFont),
      removeFont: (id) => editSystem((system) => removeFont(system, id)),
      removeFontSlot: (id, slot) =>
        editSystem((system) => removeFontSlot(system, id, slot).system),
      renameFont: (id, name) =>
        editSystem((system) => renameFont(system, id, name)),
      setGoogleFont: (id, slot, family, generic) =>
        editSystem((system) =>
          setGoogleFont(system, id, slot, family, generic),
        ),
      setLocalFont: (id, slot, family) =>
        editSystem((system) => setLocalFont(system, id, family, slot)),
      removeGroup: (groupId) =>
        editSystem((system) => removeGroup(system, groupId)),
    };
  }, [setProject]);
}
