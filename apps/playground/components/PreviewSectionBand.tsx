"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import {
  previewImageStore,
  previewSectionFillStyle,
  type PreviewSectionFill,
} from "@blueprint/ui";
import {
  PreviewSectionMenu,
  type PreviewImageError,
} from "./PreviewSectionMenu";
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
  workspaceId,
  className,
  children,
  onPickColour,
  onFillChange,
  onError,
}: {
  as?: ElementType;
  sectionId: string;
  label: string;
  fill: PreviewSectionFill;
  workspaceId: string | null;
  className?: string;
  children: ReactNode;
  onPickColour: () => void;
  onFillChange: (fill: PreviewSectionFill) => void;
  onError: (error: PreviewImageError) => void;
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

  return (
    <Tag
      className={className ? `${styles.band} ${className}` : styles.band}
      data-preview-section={sectionId}
      style={fillStyle as CSSProperties}
    >
      <PreviewSectionMenu
        fill={fill}
        label={label}
        sectionId={sectionId}
        workspaceId={workspaceId}
        onError={onError}
        onFillChange={onFillChange}
        onPickColour={onPickColour}
      />
      {children}
    </Tag>
  );
}
