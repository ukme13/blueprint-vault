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
import { Text } from "@astryxdesign/core/Text";
import {
  PREVIEW_FILL_TOKEN_GROUPS,
  PREVIEW_SECTION_LABEL,
  PREVIEW_SECTION_SEED_TOKEN,
  previewTokenSelectorOptions,
  semanticVariableName,
  type PreviewSectionFill,
  type PreviewSectionId,
  type SemanticToken,
} from "@blueprint/ui";
import { PreviewColourSwatch } from "./PreviewColourSwatch";
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
  tokenColors,
  error,
  onOpenChange,
  onTokenChange,
  onResetToDefault,
}: {
  isOpen: boolean;
  sectionId: PreviewSectionId | null;
  fill: PreviewSectionFill | null;
  tokens: readonly SemanticToken[];
  tokenColors?: Record<string, string>;
  error: PreviewImageError | null;
  onOpenChange: (isOpen: boolean) => void;
  onTokenChange: (tokenId: string) => void;
  onResetToDefault?: () => void;
}) {
  const options = useMemo(
    () =>
      previewTokenSelectorOptions(tokens, PREVIEW_FILL_TOKEN_GROUPS).map(
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
    [tokens, tokenColors],
  );
  const defaultTokenId = sectionId
    ? PREVIEW_SECTION_SEED_TOKEN[sectionId]
    : "surface.base";
  const isOverridden =
    fill?.kind === "image" ||
    (fill?.kind === "token" && fill.tokenId !== defaultTokenId);
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
              {isOverridden && onResetToDefault ? (
                <HStack gap={2}>
                  <Button
                    label="Reset to default"
                    size="sm"
                    variant="ghost"
                    onClick={onResetToDefault}
                  />
                </HStack>
              ) : null}
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
