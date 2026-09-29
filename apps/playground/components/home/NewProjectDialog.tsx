"use client";

import { type FormEvent } from "react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { WORKSPACE_PRESETS, findWorkspacePreset } from "@blueprint/ui";
import { PresetDetails } from "./PresetDetails";
import { PresetGallery } from "./PresetGallery";
import styles from "./new-project-dialog.module.css";

/**
 * Name + a starting point, without leaving Home, laid out as a template
 * browser: the presets as a gallery on the left, the chosen one's details,
 * the name and the buttons on the right, as Adobe's New Document does.
 *
 * `purpose="info"` so the backdrop closes it. The guard `form` gives is
 * against losing typed input, and what is typed here is a name and a choice
 * of preset, both a second's work to redo. Create still lands on the colour
 * bench; this dialog is only the door. It always adds a card — it never
 * replaces another workspace.
 */
export function NewProjectDialog({
  error,
  isOpen,
  name,
  presetId,
  onOpenChange,
  onPresetChange,
  onSubmit,
  onNameChange,
}: {
  error: string;
  isOpen: boolean;
  name: string;
  presetId: string;
  onOpenChange: (isOpen: boolean) => void;
  onPresetChange: (presetId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (name: string) => void;
}) {
  const preset = findWorkspacePreset(presetId) ?? WORKSPACE_PRESETS[0]!;

  return (
    <Dialog
      isOpen={isOpen}
      padding={0}
      purpose="info"
      width={780}
      onOpenChange={onOpenChange}
    >
      <form className={styles.form} onSubmit={onSubmit}>
        <DialogHeader title="New project" onOpenChange={onOpenChange} />
        <div className={styles.body}>
          <PresetGallery presetId={preset.id} onPresetChange={onPresetChange} />
          <PresetDetails
            error={error}
            name={name}
            preset={preset}
            onCancel={() => onOpenChange(false)}
            onNameChange={onNameChange}
          />
        </div>
      </form>
    </Dialog>
  );
}
