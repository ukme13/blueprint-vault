import type { TypeGroup } from "./system";

/**
 * Which role groups are open, when a phone shows them as an accordion.
 *
 * Every group expanded is a scroll of every role in the system, which on a
 * phone is several screens of fields before the group you wanted. So the
 * groups fold, and only the first starts open.
 *
 * `stored` is null until somebody opens or closes one, so the default follows
 * the groups rather than being fixed at the first render: a system that loads
 * after the panel mounts still gets its first group open.
 */
export function openRoleGroupIds(
  stored: readonly string[] | null,
  groups: readonly TypeGroup[],
): string[] {
  if (stored !== null) return [...stored];
  return groups[0] ? [groups[0].id] : [];
}

/** Open a closed group, or close an open one. The others stay as they are. */
export function toggleRoleGroup(
  open: readonly string[],
  groupId: string,
): string[] {
  return open.includes(groupId)
    ? open.filter((id) => id !== groupId)
    : [...open, groupId];
}

/**
 * Carry a group's open state across a rename.
 *
 * Renaming re-slugs the group's id, and the id is what the open state is kept
 * by. Without this, finishing a rename folded the group you had just typed
 * in.
 */
export function renameOpenRoleGroup(
  open: readonly string[],
  fromId: string,
  toId: string,
): string[] {
  return open.map((id) => (id === fromId ? toId : id));
}
