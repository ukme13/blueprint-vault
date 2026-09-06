"use client";

import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";

/**
 * The row actions, in two places.
 *
 * Astryx's `ContextMenu` for right-click and `DropdownMenu` for the "…"
 * button, from one list of items — because a context menu is not reachable
 * from a keyboard or a touch screen, and Astryx's own guidance says every
 * action in one has to be available somewhere else.
 *
 * No logic here. Each item calls a stage 2 function through its handler and
 * the caller renders the refusals; this file decides what the menu says and
 * nothing about what it does.
 */

export interface SemanticRowActions {
  copy: () => void;
  paste: () => void;
  /** Open the draft for a new folder. */
  newGroup: () => void;
  /** Move the target rows into an existing folder. */
  moveToGroup: (group: string) => void;
  /** Existing folders available to the move submenu. */
  groups: Array<{ id: string; label: string }>;
  duplicate: () => void;
  remove: () => void;
  /** True when nothing on the clipboard can be pasted. */
  canPaste: boolean;
  /** How many rows the action applies to, for the labels. */
  count: number;
}

export function semanticMenuItems(actions: SemanticRowActions) {
  const many = actions.count > 1;
  const rows = many ? `${actions.count} rows` : "row";

  return [
    { label: many ? `Copy ${rows}` : "Copy", onClick: actions.copy },
    { label: "Paste", onClick: actions.paste, isDisabled: !actions.canPaste },
    { type: "divider" as const },
    {
      id: "move-to-group",
      label: "Move to group…",
      items: [
        ...actions.groups.map((group) => ({
          id: `move-to-${group.id}`,
          label: group.label,
          onClick: () => actions.moveToGroup(group.id),
        })),
        { type: "divider" as const },
        { id: "new-group", label: "New group", onClick: actions.newGroup },
      ],
    },
    {
      label: many ? `Duplicate ${rows}` : "Duplicate",
      onClick: actions.duplicate,
    },
    {
      label: many ? `Delete ${rows}` : "Delete",
      onClick: actions.remove,
      /* The error colour, which is what Astryx's destructive variant is for.
         The refusal for a load-bearing row is still the stage 2 function's, so
         this is a warning about intent rather than a guard. */
      variant: "destructive" as const,
    },
  ];
}

export function SemanticRowMenuButton({
  actions,
  label,
}: {
  actions: SemanticRowActions;
  label: string;
}) {
  return (
    <DropdownMenu
      alignment="end"
      button={{
        "aria-label": label,
        label: "…",
        size: "sm",
        variant: "ghost",
      }}
      hasChevron={false}
      items={semanticMenuItems(actions)}
      menuWidth={220}
      placement="below"
    />
  );
}
