"use client";

import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";

export function layoutUsesMenuItems(actions: {
  duplicate: () => void;
  remove: () => void;
}) {
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
  onDuplicate,
  onRemove,
}: {
  label: string;
  onDuplicate: () => void;
  onRemove: () => void;
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
        duplicate: onDuplicate,
        remove: onRemove,
      })}
      menuWidth={180}
      placement="below"
    />
  );
}
