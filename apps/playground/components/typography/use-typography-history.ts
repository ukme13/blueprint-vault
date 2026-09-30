"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  createTypographyHistory,
  type TypeSystem,
  type TypographyHistory,
} from "@blueprint/ui";
import { useUndoShortcut } from "../use-undo-shortcut";
import type { TypographyProject } from "./typography-project";

/**
 * Which control made an edit, by the system it produced.
 *
 * Read by the effect below to coalesce a drag or a run of keystrokes into one
 * undo step. Keyed on the resulting system, not held in a ref beside it: a ref
 * set when the edit is called can outlive an edit that changed nothing and
 * label the next, unrelated one. A `WeakMap` writes nothing that matters twice,
 * so it is safe inside a state updater, which React may run twice.
 */
const EDIT_KEYS = new WeakMap<TypeSystem, string>();

/** Notes the control an edit came from, on the system it produced. */
export function tagEdit(system: TypeSystem, key: string | undefined): void {
  if (key !== undefined) EDIT_KEYS.set(system, key);
}

export interface TypographyHistoryBinding {
  undo: () => void;
  redo: () => void;
  /** Whether there is something to undo or redo, read when asked. */
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * Undo and redo for the type system, bound to React.
 *
 * What a step is, when a write coalesces and what an undo puts back all live
 * in `@blueprint/ui`. This binds them to the project state. Every edit funnels
 * through `setProject`, so recording watches the system rather than being
 * called from each action: any change to it that this hook did not itself
 * apply is a step. The first system seen is the start of the history, not a
 * step, and an undo or redo puts a system back that the history already holds.
 *
 * `onApply` is told when an undo or redo puts a system back, for anything
 * kept beside the system that has to follow it.
 */
export function useTypographyHistory(
  project: TypographyProject | null,
  setProject: Dispatch<SetStateAction<TypographyProject | null>>,
  onApply?: (next: TypeSystem, previous: TypeSystem) => void,
): TypographyHistoryBinding {
  const system = project?.system ?? null;
  const history = useRef<TypographyHistory | null>(null);

  useEffect(() => {
    if (!system) return;
    const current = history.current;
    if (!current) {
      history.current = createTypographyHistory(system);
      return;
    }
    /* An undo or redo this hook applied: the history already holds it. */
    if (system === current.present) return;
    current.commit(system, { key: EDIT_KEYS.get(system) });
  }, [system]);

  const apply = useCallback(
    (next: TypeSystem) => {
      const previous = system;
      setProject((current) =>
        current ? { ...current, system: next } : current,
      );
      if (previous) onApply?.(next, previous);
    },
    [system, setProject, onApply],
  );

  const undo = useCallback(() => {
    const next = history.current?.undo();
    if (next) apply(next);
  }, [apply]);

  const redo = useCallback(() => {
    const next = history.current?.redo();
    if (next) apply(next);
  }, [apply]);

  useUndoShortcut(undo, redo);

  return {
    undo,
    redo,
    canUndo: () => history.current?.canUndo ?? false,
    canRedo: () => history.current?.canRedo ?? false,
  };
}
