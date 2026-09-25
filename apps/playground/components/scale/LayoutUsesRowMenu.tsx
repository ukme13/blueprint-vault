"use client";

import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";

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

export function LayoutUsesRowMenu({
  label,
  isSystem,
  onDuplicate,
  onRemove,
  onReset,
}: {
  label: string;
  isSystem: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
  onReset: () => void;
}) {
  return (
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
        remove: onRemove,
        reset: onReset,
      })}
      menuWidth={180}
      placement="below"
    />
  );
}
