"use client";

import { useRef, useState } from "react";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import {
  createPreviewImageId,
  inspectPreviewImageFile,
  previewImageStore,
  type PreviewSectionFill,
} from "@blueprint/ui";
import { Ellipsis } from "lucide-react";
import styles from "./PreviewSectionBand.module.css";

export type PreviewImageError = "too-large" | "not-image" | "unavailable";

export function previewImageErrorCopy(error: PreviewImageError): string {
  if (error === "too-large") return "That image is over 2 MB.";
  if (error === "not-image") return "Choose an image file.";
  return "Images cannot be stored in this browser.";
}

/**
 * Studio ⋯ on a frozen `/preview` band. Lives outside `components/preview/`
 * so the canvas scanners do not have to exempt chrome.
 */
export function PreviewSectionMenu({
  label,
  fill,
  sectionId,
  workspaceId,
  onPickColour,
  onFillChange,
  onError,
}: {
  label: string;
  fill: PreviewSectionFill;
  sectionId: string;
  workspaceId: string | null;
  onPickColour: () => void;
  onFillChange: (fill: PreviewSectionFill) => void;
  onError: (error: PreviewImageError) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fallbackTokenId =
    fill.kind === "token" ? fill.tokenId : fill.fallbackTokenId;

  const items = [
    {
      label: "Background colour…",
      onClick: onPickColour,
    },
    {
      label: "Upload image…",
      onClick: () => inputRef.current?.click(),
    },
    ...(fill.kind === "image"
      ? [
          {
            label: "Remove image",
            onClick: () =>
              onFillChange({ kind: "token", tokenId: fallbackTokenId }),
          },
        ]
      : []),
  ];

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const refusal = inspectPreviewImageFile(file);
    if (refusal) {
      onError(refusal);
      return;
    }
    if (!workspaceId) {
      onError("unavailable");
      return;
    }
    try {
      const imageId = createPreviewImageId();
      const data = await file.arrayBuffer();
      await previewImageStore().put({
        id: imageId,
        workspaceId,
        sectionId,
        fileName: file.name,
        mimeType: file.type || "image/png",
        size: file.size,
        addedAt: Date.now(),
        data,
      });
      if (fill.kind === "image") {
        void previewImageStore()
          .remove(fill.imageId)
          .catch(() => {});
      }
      onFillChange({
        kind: "image",
        imageId,
        fallbackTokenId,
      });
    } catch {
      onError("unavailable");
    }
  };

  return (
    <div
      className={menuOpen ? `${styles.menu} ${styles.menuOpen}` : styles.menu}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu
        alignment="end"
        button={{
          "aria-label": `Section fill for ${label}`,
          icon: <Ellipsis />,
          isIconOnly: true,
          label: `Section fill for ${label}`,
          size: "sm",
          variant: "ghost",
        }}
        hasChevron={false}
        isMenuOpen={menuOpen}
        items={items}
        menuWidth={200}
        onOpenChange={setMenuOpen}
        placement="below"
      />
      <input
        ref={inputRef}
        accept="image/*"
        className={styles.file}
        tabIndex={-1}
        type="file"
        onChange={(event) => {
          const next = event.target.files?.[0];
          event.target.value = "";
          void onFile(next);
        }}
      />
    </div>
  );
}
