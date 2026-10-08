"use client";

import { useState } from "react";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { ConfirmDialog } from "../ConfirmDialog";

/** How long a deleted group takes to fold away; the CSS keyframe matches. */
export const GROUP_LEAVE_MS = 200;

/**
 * A group on its way out: `leave` starts the fold from the card's height, and
 * the group is removed from the system when it ends. Under reduced motion
 * there is no fold, so it goes at once. `height` is null until then.
 */
export function useLeavingGroup(onRemove: () => void) {
  const [height, setHeight] = useState<number | null>(null);
  const leave = (card: HTMLElement | null) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onRemove();
      return;
    }
    setHeight(card?.offsetHeight ?? 0);
    /* Not cleared on unmount: a tab switch during the fold still deletes,
       and the removal is a state update on the studio, not on this card. */
    window.setTimeout(onRemove, GROUP_LEAVE_MS);
  };
  return { isLeaving: height !== null, height, leave };
}

/**
 * The group's actions behind one button: Duplicate group, and Delete group.
 *
 * Delete asks first when it would take roles with it, and always on a phone,
 * where the menu sits among fields a thumb is tapping. An empty group on a
 * wide screen goes without asking: there is nothing in it to lose.
 */
export function RoleGroupMenu({
  label,
  roleCount,
  alwaysConfirm,
  isProtected = false,
  onDuplicate,
  onDelete,
}: {
  label: string;
  roleCount: number;
  alwaysConfirm: boolean;
  /** A core group: it can be duplicated, but there is no way to delete it. */
  isProtected?: boolean;

  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <DropdownMenu
        alignment="end"
        button={{
          "aria-label": `${label} group actions`,
          label: "…",
          size: "md",
          variant: "ghost",
        }}
        hasChevron={false}
        items={[
          { label: "Duplicate group", onClick: onDuplicate },
          ...(isProtected
            ? []
            : [
                {
                  label: "Delete group",
                  onClick: () =>
                    alwaysConfirm || roleCount > 0
                      ? setIsConfirming(true)
                      : onDelete(),
                  variant: "destructive" as const,
                },
              ]),
        ]}
        menuWidth={180}
        placement="below"
      />
      <ConfirmDialog
        actionLabel="Delete group"
        description={
          roleCount === 0
            ? "This group has no roles."
            : `Its ${roleCount} ${roleCount === 1 ? "role goes" : "roles go"} with it.`
        }
        isOpen={isConfirming}
        title={`Delete group "${label}"?`}
        onAction={() => {
          setIsConfirming(false);
          onDelete();
        }}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  );
}
