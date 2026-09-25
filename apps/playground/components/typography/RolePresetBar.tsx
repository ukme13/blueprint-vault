"use client";

import { useState } from "react";
import {
  applyTypeRolePreset,
  detectTypeRolePreset,
  TYPE_ROLE_PRESETS,
  type TypeRolePresetId,
  type TypeSystem,
} from "@blueprint/ui";
import { ConfirmDialog } from "../ConfirmDialog";

/* Every chip is a pill: the idle ones outlined, the active one, a preset or
   Custom, filled with primary, so exactly one says "this". */
const CHIP =
  "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors select-none";
const ACTIVE = "border-action-primary bg-action-primary text-fg-on-action";
const IDLE =
  "border-border-strong bg-transparent text-fg-primary hover:bg-surface-subtle";

/**
 * Starting sets of groups and roles, as chips above the Groups tab.
 *
 * The chip that matches the system exactly is marked; once any group or
 * role is changed none does, and a Custom chip says so. Picking a preset
 * replaces every group and role but keeps the fonts and the scale. From a
 * preset that is instant, since nothing of the author's is lost. From
 * Custom it asks first: this studio has no undo, and the changes would be
 * gone.
 */
export function RolePresetBar({
  system,
  onApply,
}: {
  system: TypeSystem;
  onApply: (next: Pick<TypeSystem, "groups" | "roles">) => void;
}) {
  const active = detectTypeRolePreset(system);
  const [pending, setPending] = useState<TypeRolePresetId | null>(null);

  const apply = (id: TypeRolePresetId) => {
    const next = applyTypeRolePreset(system, id);
    onApply({ groups: next.groups, roles: next.roles });
  };

  const pendingLabel = TYPE_ROLE_PRESETS.find(
    (preset) => preset.id === pending,
  )?.label;

  return (
    <>
      <div
        aria-label="Role presets"
        /* One line that scrolls sideways, running to the panel's edge so a
           chip is cut there, with 16px before the first and after the last.
           No scrollbar: the cut chip says there is more. */
        className="mb-4 flex items-center gap-1.5 overflow-x-auto px-4 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-scrolls-sideways=""
        /* A toolbar, not a group: the group cards below are the Groups tab's
           groups, and a spec lists them by that role. */
        role="toolbar"
      >
        {TYPE_ROLE_PRESETS.map((preset) => {
          const isSelected = active === preset.id;
          return (
            <button
              key={preset.id}
              aria-pressed={isSelected}
              className={`${CHIP} cursor-pointer ${isSelected ? ACTIVE : IDLE}`}
              title={preset.description}
              type="button"
              onClick={() => {
                if (isSelected) return;
                if (active === "custom") setPending(preset.id);
                else apply(preset.id);
              }}
            >
              {preset.label}
            </button>
          );
        })}
        {active === "custom" ? (
          <span
            aria-current="true"
            className={`${CHIP} ${ACTIVE}`}
            data-role-preset="custom"
          >
            Custom
          </span>
        ) : null}
      </div>
      <ConfirmDialog
        actionLabel={`Use ${pendingLabel ?? "preset"}`}
        description="Your groups and roles are replaced, and your changes to them are lost. Fonts and the scale stay."
        isOpen={pending !== null}
        title={`Replace your roles with ${pendingLabel ?? "this preset"}?`}
        onAction={() => {
          if (pending) apply(pending);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
