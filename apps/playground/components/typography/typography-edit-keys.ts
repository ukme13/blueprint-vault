import type { TypeSystem } from "@blueprint/ui";

/**
 * Which control made an edit, by the system it produced.
 *
 * Read when the studio persists the system, to hand the store's history the
 * key that coalesces a drag or a run of keystrokes into one undo step. Keyed on
 * the resulting system, not held in a ref beside it: a ref set when the edit
 * is called can outlive an edit that changed nothing and label the next,
 * unrelated one. A `WeakMap` writes nothing that matters twice, so it is safe
 * inside a state updater, which React may run twice.
 */
const EDIT_KEYS = new WeakMap<TypeSystem, string>();

/** Notes the control an edit came from, on the system it produced. */
export function tagEdit(system: TypeSystem, key: string | undefined): void {
  if (key !== undefined) EDIT_KEYS.set(system, key);
}

/** The control an edit came from, or undefined for a discrete one. */
export function editKeyOf(system: TypeSystem): string | undefined {
  return EDIT_KEYS.get(system);
}
