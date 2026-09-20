"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import {
  HStack,
  Layout,
  LayoutContent,
  VStack,
} from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import {
  PREVIEW_TEXT_COLOR_GROUPS,
  idsSharingStyle,
  previewDocumentRoleOptions,
  previewInspectorChrome,
  previewTokenSelectorOptions,
  semanticVariableName,
  type PreviewDocumentBlock,
  type SemanticToken,
  type TypeSystem,
} from "@blueprint/ui";
import { PreviewColourSwatch } from "./PreviewColourSwatch";

const PAGE_DEFAULT_COLOR = "page-default";

/**
 * Inspector for one preview slot: copy, type role, and token colour.
 *
 * Lives outside `components/preview/` so the canvas scanners do not have to
 * exempt studio chrome.
 *
 * `purpose="info"` because every keystroke is already written. A form
 * purpose would lock the backdrop after typing, which is the opposite of
 * inspecting a page.
 */
export function PreviewInspector({
  isOpen,
  block,
  defaultBlock,
  slotId,
  system,
  tokens,
  tokenColors,
  onOpenChange,
  onTextChange,
  onRoleChange,
  onColorChange,
  onApplyToGroup,
  onResetToDefault,
}: {
  isOpen: boolean;
  block: PreviewDocumentBlock | null;
  defaultBlock?: PreviewDocumentBlock | null;
  slotId: string | null;
  system: TypeSystem;
  tokens: readonly SemanticToken[];
  tokenColors?: Record<string, string>;
  onOpenChange: (isOpen: boolean) => void;
  onTextChange: (text: string) => void;
  onRoleChange: (roleId: string) => void;
  onColorChange: (colorTokenId: string | undefined) => void;
  onApplyToGroup: () => void;
  onResetToDefault?: () => void;
}) {
  const chrome = previewInspectorChrome(slotId ?? "");
  const grouped = slotId ? idsSharingStyle(slotId).length > 1 : false;
  const isOverridden = defaultBlock
    ? block?.text !== defaultBlock.text ||
      block?.roleId !== defaultBlock.roleId ||
      block?.colorTokenId !== defaultBlock.colorTokenId
    : Boolean(block?.colorTokenId);
  const options = useMemo(
    () =>
      previewDocumentRoleOptions(system).map((group) => ({
        type: "section" as const,
        title: group.groupLabel,
        options: group.roles.map((role) => ({
          value: role.id,
          label: role.name,
        })),
      })),
    [system],
  );
  const colorOptions = useMemo(
    () => [
      {
        type: "section" as const,
        title: "Default",
        options: [
          {
            value: PAGE_DEFAULT_COLOR,
            label: "Page default",
            icon: <PreviewColourSwatch variable={null} />,
          },
        ],
      },
      ...previewTokenSelectorOptions(tokens, PREVIEW_TEXT_COLOR_GROUPS).map(
        (section) => ({
          ...section,
          options: section.options.map((opt) => ({
            ...opt,
            icon: (
              <PreviewColourSwatch
                hex={tokenColors?.[opt.value]}
                variable={semanticVariableName(opt.value)}
              />
            ),
          })),
        }),
      ),
    ],
    [tokens, tokenColors],
  );

  /* Keep the native <dialog> out of the tree while idle. Astryx opens it with
     showModal(), which moves the node onto the top layer; Strict Mode, Fast
     Refresh, or a device remount then calls removeChild on a parent that is
     already null. Stay mounted for one frame after close so close() can run
     before the node is dropped. */
  const [mounted, setMounted] = useState(isOpen);
  if (isOpen && !mounted) setMounted(true);
  useEffect(() => {
    if (isOpen) return;
    const frame = requestAnimationFrame(() => setMounted(false));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

  return (
    <Dialog
      isOpen={isOpen}
      purpose="info"
      width={440}
      onOpenChange={onOpenChange}
    >
      <Layout
        header={
          <DialogHeader
            subtitle={chrome.subtitle}
            title={chrome.title}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <TextArea
                hasAutoFocus
                label="Copy"
                rows={5}
                value={block?.text ?? ""}
                width="100%"
                onChange={onTextChange}
              />
              <Selector
                label="Type role"
                options={options}
                placeholder="Style"
                value={block?.roleId}
                width="100%"
                onChange={(value) => {
                  if (!value) return;
                  onRoleChange(value);
                }}
              />
              <Selector
                label="Colour"
                options={colorOptions}
                placeholder="Token"
                value={block?.colorTokenId ?? PAGE_DEFAULT_COLOR}
                width="100%"
                onChange={(value) => {
                  if (!value || value === PAGE_DEFAULT_COLOR) {
                    onColorChange(undefined);
                    return;
                  }
                  onColorChange(value);
                }}
              />
              {grouped || (isOverridden && onResetToDefault) ? (
                <HStack gap={2}>
                  {grouped ? (
                    <Button
                      label="Apply to group"
                      size="sm"
                      variant="secondary"
                      onClick={onApplyToGroup}
                    />
                  ) : null}
                  {isOverridden && onResetToDefault ? (
                    <Button
                      label="Reset to default"
                      size="sm"
                      variant="ghost"
                      onClick={onResetToDefault}
                    />
                  ) : null}
                </HStack>
              ) : null}
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
