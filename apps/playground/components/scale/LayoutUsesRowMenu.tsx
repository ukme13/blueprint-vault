"use client";

import { useState } from "react";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { ConfirmDialog } from "../ConfirmDialog";

/**
 * A custom use can be copied or deleted. A system use can only go back to
 * how it ships: the preview and the export rely on it, so it is never
 * removed, and a copy would be a second corner or inset nothing reads.
 */
export function layoutUsesMenuItems(actions: {
  isSystem: boolean;
  duplicate: () => void;
  remove: () => void;
  reset: () => void;
}) {
  if (actions.isSystem) {
    return [{ label: "Reset to default", onClick: actions.reset }];
  }
  return [
    { label: "Duplicate", onClick: actions.duplicate },
    {
      label: "Delete",
      onClick: actions.remove,
      variant: "destructive" as const,
    },
  ];
}

/**
 * The row's menu. Delete asks first: the use's variable may already be in
 * somebody's stylesheet, and the row takes its values with it.
 */
export function LayoutUsesRowMenu({
  label,
  tokenName,
  variableName,
  isSystem,
  onDuplicate,
  onRemove,
  onReset,
}: {
  label: string;
  /** The use's name, as the table shows it. */
  tokenName: string;
  /** Its exported variable, `--inset-card`. */
  variableName: string;
  isSystem: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
  onReset: () => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  return (
    <>
      <DropdownMenu
        alignment="end"
        button={{
          "aria-label": label,
          label: "…",
          /* The value fields beside it are 32px. */
          size: "md",
          variant: "ghost",
        }}
        hasChevron={false}
        items={layoutUsesMenuItems({
          isSystem,
          duplicate: onDuplicate,
          remove: () => setIsConfirming(true),
          reset: onReset,
        })}
        menuWidth={180}
        placement="below"
      />
      <ConfirmDialog
        actionLabel="Delete use"
        description={`This removes the ${variableName} token and its value.`}
        isOpen={isConfirming}
        title={`Delete use "${tokenName}"?`}
        onAction={() => {
          setIsConfirming(false);
          onRemove();
        }}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  );
}
