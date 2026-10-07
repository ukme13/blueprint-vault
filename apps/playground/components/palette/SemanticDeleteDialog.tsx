"use client";

import { ConfirmDialog } from "../ConfirmDialog";

/**
 * Asks before semantic tokens go. A token is a variable somebody's stylesheet
 * may already read, and a selection can hold many of them, so the menu, the
 * batch action and the Delete key all come through here.
 */
export function SemanticDeleteDialog({
  ids,
  onConfirm,
  onCancel,
}: {
  /** The tokens to delete; null when nothing is being asked. */
  ids: readonly string[] | null;
  onConfirm: (ids: readonly string[]) => void;
  onCancel: () => void;
}) {
  const one = ids?.length === 1;
  return (
    <ConfirmDialog
      actionLabel={`Delete token${one ? "" : "s"}`}
      description={`This removes the semantic token${one ? "" : "s"} and their CSS variables.`}
      isOpen={ids !== null}
      title={`Delete ${one ? `token "${ids![0]}"` : `${ids?.length ?? 0} tokens`}?`}
      onAction={() => {
        if (ids) onConfirm(ids);
      }}
      onCancel={onCancel}
    />
  );
}
