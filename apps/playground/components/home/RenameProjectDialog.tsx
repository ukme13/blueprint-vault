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
 * Rename an existing workspace without opening it.
 */
export function RenameProjectDialog({
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
      purpose="info"
      width={440}
      onOpenChange={onOpenChange}
    >
      <form onSubmit={onSubmit}>
        <Layout
          header={
            <DialogHeader
              subtitle="Choose a new name for this workspace."
              title="Rename project"
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={4}>
                <TextInput
                  hasAutoFocus
                  label="Project name"
                  placeholder={DEFAULT_WORKSPACE_NAME}
                  value={name}
                  onChange={onNameChange}
                />
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
                  Save
                </Button>
              </HStack>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
