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
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button, DEFAULT_WORKSPACE_NAME } from "@blueprint/ui";

/**
 * Name + Blueprint seed, without leaving Home.
 *
 * `purpose="form"` so a click on the backdrop does not dump the name. Create
 * still lands on the colour bench; this dialog is only the door. It always
 * adds a card — it never replaces another workspace.
 */
export function NewProjectDialog({
  error,
  isOpen,
  name,
  onOpenChange,
  onSubmit,
  onNameChange,
}: {
  error: string;
  isOpen: boolean;
  name: string;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (name: string) => void;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      purpose="form"
      width={440}
      onOpenChange={onOpenChange}
    >
      <form onSubmit={onSubmit}>
        <Layout
          header={
            <DialogHeader
              subtitle="Name it. The Blueprint seed fills colour, type, and scale — edit those after."
              title="New project"
              onOpenChange={onOpenChange}
            />
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
                <p>
                  Preset: <strong>Blueprint seed</strong>
                </p>
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
