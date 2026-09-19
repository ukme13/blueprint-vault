"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import {
  PREVIEW_FILL_TOKEN_GROUPS,
  PREVIEW_SECTION_LABEL,
  previewTokenSelectorOptions,
  type PreviewSectionFill,
  type PreviewSectionId,
  type SemanticToken,
} from "@blueprint/ui";
import {
  previewImageErrorCopy,
  type PreviewImageError,
} from "./PreviewSectionMenu";

/**
 * Token picker for a frozen `/preview` band. Image upload stays on the ⋯.
 *
 * Lives outside `components/preview/` so the canvas scanners do not have to
 * exempt studio chrome.
 */
export function PreviewSectionInspector({
  isOpen,
  sectionId,
  fill,
  tokens,
  error,
  onOpenChange,
  onTokenChange,
}: {
  isOpen: boolean;
  sectionId: PreviewSectionId | null;
  fill: PreviewSectionFill | null;
  tokens: readonly SemanticToken[];
  error: PreviewImageError | null;
  onOpenChange: (isOpen: boolean) => void;
  onTokenChange: (tokenId: string) => void;
}) {
  const options = previewTokenSelectorOptions(
    tokens,
    PREVIEW_FILL_TOKEN_GROUPS,
  );
  const tokenId = fill?.kind === "token" ? fill.tokenId : fill?.fallbackTokenId;
  const title = sectionId ? PREVIEW_SECTION_LABEL[sectionId] : "Section";

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
            subtitle="Fill"
            title={title}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              {error ? (
                <Text color="accent" type="supporting">
                  {previewImageErrorCopy(error)}
                </Text>
              ) : null}
              <Selector
                label="Background colour"
                options={options}
                placeholder="Token"
                value={tokenId}
                width="100%"
                onChange={(value) => {
                  if (!value) return;
                  onTokenChange(value);
                }}
              />
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
