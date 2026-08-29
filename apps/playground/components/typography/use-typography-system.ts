import { useMemo, type Dispatch, type SetStateAction } from "react";
import {
  addFont,
  canAddRole,
  moveGroup,
  reindexGroup,
  removeFont,
  renameFont,
  renameGroup,
  type TypeGroup,
  type TypeRole,
  type TypeSystem,
} from "@blueprint/ui";
import type { TypographyProject } from "./typography-project";

/* Every edit below is TypeSystem -> TypeSystem. None of them touch the
   preferences beside the system, and none of them need to know whether a
   project exists — editSystem answers that once, for all of them. Keeping them
   pure and at module scope also means they can be tested without a component
   around them. */

function withRolePatch(
  system: TypeSystem,
  id: string,
  patch: Partial<TypeRole>,
): TypeSystem {
  return {
    ...system,
    roles: system.roles.map((role) =>
      role.id === id ? { ...role, ...patch } : role,
    ),
  };
}

/** Line height and letter spacing are always per-role and never linked. */
function withRoleValue(
  system: TypeSystem,
  id: string,
  patch: Partial<{ lineHeight: number; letterSpacingPx: number }>,
): TypeSystem {
  return {
    ...system,
    roles: system.roles.map((role) =>
      role.id === id
        ? {
            ...role,
            desktop: { ...role.desktop, ...patch },
            mobile: { ...role.mobile, ...patch },
          }
        : role,
    ),
  };
}

function withNewRole(system: TypeSystem, group: TypeGroup): TypeSystem {
  if (!canAddRole(system, group)) return system;

  const template =
    system.roles.find((role) => role.groupId === group.id) ??
    system.roles.find((role) => role.id === "body") ??
    system.roles[0];
  if (!template) return system;

  /* Placeholder id: reindexGroup gives every role in the group its real name,
     which is how a lone `caption` becomes `caption-1` once a second one joins
     it. */
  const placeholder = `${group.id}-new-${system.roles.length}`;
  const withRole: TypeSystem = {
    ...system,
    roles: [
      ...system.roles,
      {
        ...template,
        id: placeholder,
        name: placeholder,
        groupId: group.id,
        /* A new role reuses its sibling's step rather than claiming one of its
           own. Adding roles must never force the ramp to grow. */
        stepOffset: template.stepOffset,
        sameAsRoleId: null,
      },
    ],
  };

  return reindexGroup(withRole, group.id);
}

function withoutRole(system: TypeSystem, id: string): TypeSystem {
  const groupId = system.roles.find((role) => role.id === id)?.groupId;

  const without: TypeSystem = {
    ...system,
    roles: system.roles
      .filter((role) => role.id !== id)
      /* Anything following the removed role keeps its size rather than
         silently falling back to whatever it stored. */
      .map((role) =>
        role.sameAsRoleId === id ? { ...role, sameAsRoleId: null } : role,
      ),
  };

  return groupId ? reindexGroup(without, groupId) : without;
}

function withGroupPatch(
  system: TypeSystem,
  groupId: string,
  patch: Partial<TypeGroup>,
): TypeSystem {
  const updated: TypeSystem = {
    ...system,
    groups: system.groups.map((group) =>
      group.id === groupId ? { ...group, ...patch } : group,
    ),
  };
  /* Switching a group between number and size renames its roles, so the ids
     follow the mode rather than whatever they were created under. */
  return reindexGroup(updated, groupId);
}

function withNewGroup(system: TypeSystem): TypeSystem {
  let index = system.groups.length + 1;
  while (system.groups.some((group) => group.id === `group-${index}`)) {
    index += 1;
  }
  return {
    ...system,
    groups: [
      ...system.groups,
      { id: `group-${index}`, label: `Group ${index}`, indexing: "number" },
    ],
  };
}

/* The picker writes a stack, so the entry becomes a Google one by definition. */
function withFontFamilies(
  system: TypeSystem,
  id: string,
  families: string[],
): TypeSystem {
  return {
    ...system,
    fonts: system.fonts.map((font) =>
      font.id === id ? { ...font, families, source: "google" } : font,
    ),
  };
}

function withoutGroup(system: TypeSystem, groupId: string): TypeSystem {
  return {
    ...system,
    groups: system.groups.filter((group) => group.id !== groupId),
    roles: system.roles.filter((role) => role.groupId !== groupId),
  };
}

export interface TypographySystemActions {
  updateSystem: (patch: Partial<TypeSystem>) => void;
  updateRole: (id: string, patch: Partial<TypeRole>) => void;
  updateRoleValue: (
    id: string,
    patch: Partial<{ lineHeight: number; letterSpacingPx: number }>,
  ) => void;
  addRole: (group: TypeGroup) => void;
  removeRole: (id: string) => void;
  renameGroupById: (groupId: string, label: string) => void;
  updateGroup: (groupId: string, patch: Partial<TypeGroup>) => void;
  shiftGroup: (groupId: string, direction: -1 | 1) => void;
  addGroup: () => void;
  addFont: () => void;
  removeFont: (id: string) => void;
  renameFont: (id: string, name: string) => void;
  setFontFamilies: (id: string, families: string[]) => void;
  removeGroup: (groupId: string) => void;
}

/**
 * The edits a typography project allows, bound to its setter.
 *
 * Each one reads the system out of the updater rather than a closure, so the
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
        editSystem((system) => withRolePatch(system, id, patch)),
      updateRoleValue: (id, patch) =>
        editSystem((system) => withRoleValue(system, id, patch)),
      addRole: (group) => editSystem((system) => withNewRole(system, group)),
      removeRole: (id) => editSystem((system) => withoutRole(system, id)),
      /* Renaming a group renames its roles: ids are built from the group id, so
         the label and the exported token names would otherwise drift apart. */
      renameGroupById: (groupId, label) =>
        editSystem((system) => renameGroup(system, groupId, label)),
      updateGroup: (groupId, patch) =>
        editSystem((system) => withGroupPatch(system, groupId, patch)),
      shiftGroup: (groupId, direction) =>
        editSystem((system) => ({
          ...system,
          groups: moveGroup(system, groupId, direction),
        })),
      addGroup: () => editSystem(withNewGroup),
      addFont: () => editSystem(addFont),
      removeFont: (id) => editSystem((system) => removeFont(system, id)),
      renameFont: (id, name) =>
        editSystem((system) => renameFont(system, id, name)),
      setFontFamilies: (id, families) =>
        editSystem((system) => withFontFamilies(system, id, families)),
      removeGroup: (groupId) =>
        editSystem((system) => withoutGroup(system, groupId)),
    };
  }, [setProject]);
}
