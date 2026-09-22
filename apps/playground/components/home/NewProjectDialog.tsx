"use client";

import { type FormEvent } from "react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutFooter,
  VStack,
} from "@astryxdesign/core/Layout";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  DEFAULT_WORKSPACE_NAME,
  WORKSPACE_PRESETS,
  workspacePresetSwatches,
  type WorkspacePreset,
} from "@blueprint/ui";

/**
 * The preset's brand seeds, as three dots.
 *
 * The colours are data, so they arrive as an inline background rather than a
 * utility; the ring is a semantic token so a pale seed still has an edge on a
 * pale dialog. Decorative: the radio's own label already names the preset.
 */
function PresetSwatches({ preset }: { preset: WorkspacePreset }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {workspacePresetSwatches(preset).map((hex, index) => (
        <span
          key={`${preset.id}-${index}`}
          className="size-4 rounded-full"
          style={{
            background: hex,
            boxShadow: "inset 0 0 0 1px var(--color-border-default)",
          }}
        />
      ))}
    </span>
  );
}

/**
 * Name + Blueprint seed, without leaving Home.
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
  return (
    <Dialog
      isOpen={isOpen}
      purpose="info"
      width={440}
      onOpenChange={onOpenChange}
    >
      <form onSubmit={onSubmit}>
        <Layout
          header={
            <DialogHeader title="New project" onOpenChange={onOpenChange} />
          }
          content={
            <LayoutContent>
              <VStack gap={4}>
                <TextInput
                  label="Project name"
                  placeholder={DEFAULT_WORKSPACE_NAME}
                  value={name}
                  onChange={onNameChange}
                />
                <RadioList
                  label="Starting point"
                  value={presetId}
                  onChange={onPresetChange}
                >
                  {WORKSPACE_PRESETS.map((preset) => (
                    <RadioListItem
                      key={preset.id}
                      description={preset.summary}
                      endContent={<PresetSwatches preset={preset} />}
                      label={preset.name}
                      value={preset.id}
                    />
                  ))}
                </RadioList>
                {error ? <p role="alert">{error}</p> : null}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button
                  scheme="neutral"
                  type="button"
                  variant="text"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button scheme="primary" type="submit">
                  Create workspace
                </Button>
              </HStack>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
