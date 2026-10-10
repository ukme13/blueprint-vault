"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  previewImageStore,
  previewSectionFillStyle,
  type PreviewSectionFill,
} from "@blueprint/ui";
import { usePreviewSlotStyle } from "./preview/preview-styles-context";
import { PreviewSectionMenu } from "./PreviewSectionMenu";
import styles from "./PreviewSectionBand.module.css";

/**
 * Full-bleed fill plus the ⋯ menu for one frozen `/preview` band.
 *
 * Lives outside `components/preview/` so opacity and the menu stay off the
 * canvas scanners.
 */
export function PreviewSectionBand({
  as: Tag = "div",
  sectionId,
  label,
  fill,
  className,
  children,
  onPickColour,
  onFillChange,
}: {
  as?: ElementType;
  sectionId: string;
  label: string;
  fill: PreviewSectionFill;
  className?: string;
  children: ReactNode;
  onPickColour: () => void;
  onFillChange: (fill: PreviewSectionFill) => void;
}) {
  const imageId = fill.kind === "image" ? fill.imageId : null;
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(
    null,
  );

  useEffect(() => {
    if (!imageId) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    void previewImageStore()
      .get(imageId)
      .then((stored) => {
        if (cancelled) return;
        if (!stored) return;
        objectUrl = URL.createObjectURL(
          new Blob([stored.data], { type: stored.mimeType }),
        );
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setLoaded({ id: imageId, url: objectUrl });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  const imageUrl = loaded?.id === imageId ? loaded.url : null;

  const fillStyle = previewSectionFillStyle(fill, imageUrl);
  const overrides = usePreviewSlotStyle(sectionId, true);

  return (
    <Tag
      className={className ? `${styles.band} ${className}` : styles.band}
      data-preview-section={sectionId}
      style={{ ...fillStyle, ...overrides } as CSSProperties}
      onClick={(event: MouseEvent<HTMLElement>) => {
        /* The band itself, not a slot, a control or the menu inside it. */
        const target = event.target as HTMLElement;
        if (
          target.closest(
            "[data-preview-slot], button, a, input, textarea, select, [role='menu'], form",
          )
        ) {
          return;
        }
        onPickColour();
      }}
    >
      <PreviewSectionMenu
        fill={fill}
        label={label}
        onFillChange={onFillChange}
        onPickColour={onPickColour}
      />
      {children}
    </Tag>
  );
}
