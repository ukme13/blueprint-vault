"use client";

import { useEffect, useState } from "react";
import { Button } from "@blueprint/ui";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutFooter,
} from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";

interface SemanticNewGroupDialogProps {
  count: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCommit: (name: string) => void;
}

export function SemanticNewGroupDialog({
  count,
  isOpen,
  onOpenChange,
  onCommit,
}: SemanticNewGroupDialogProps) {
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const subtitle =
    count === 1
      ? "Move 1 token into a new group"
      : `Move ${count} tokens into a new group`;

  useEffect(() => {
    if (isOpen) setName("");
  }, [isOpen]);

  const close = () => onOpenChange(false);
  const commit = () => {
    if (!trimmed) return;
    onCommit(trimmed);
    close();
  };

  return (
    <Dialog
      isOpen={isOpen}
      purpose="form"
      width={400}
      onOpenChange={onOpenChange}
    >
      <Layout
        height="auto"
        header={
          <DialogHeader
            subtitle={subtitle}
            title="New group"
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <TextInput
              hasAutoFocus
              isRequired
              label="Group name"
              placeholder="e.g. rule"
              value={name}
              onChange={setName}
              onEnter={commit}
            />
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end">
              <Button
                scheme="neutral"
                size="small"
                variant="outlined"
                onClick={close}
              >
                Cancel
              </Button>
              <Button
                disabled={!trimmed}
                scheme="primary"
                size="small"
                variant="contained"
                onClick={commit}
              >
                Create
              </Button>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
