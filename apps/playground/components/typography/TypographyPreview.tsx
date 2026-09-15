"use client";

import type { CSSProperties } from "react";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import {
  resolveShadeHex,
  type ColorTrack,
  type PreviewDevice,
  type PreviewDocument,
  type ShadeRef,
  type TypeRole,
  type TypeScaleUnit,
  type TypeSystem,
} from "@blueprint/ui";
import { PreviewColourControls } from "./PreviewColourControls";
import {
  PreviewDocumentCanvas,
  PreviewDocumentSession,
} from "./PreviewDocumentPane";
import { PreviewDocumentToolbar } from "./PreviewDocumentToolbar";
import { PreviewSpecimenList } from "./PreviewSpecimenList";
import styles from "./typography-workspace.module.css";

export interface TypographyPreviewProps {
  /** Resolved, so elementForRole reads the sizes the preview actually shows. */
  system: TypeSystem;
  /** Largest first. */
  roles: TypeRole[];
  view: "specimen" | "preview";
  unit: TypeScaleUnit;
  remRootPx: number;
  specimenText: string;
  onSpecimenTextChange: (text: string) => void;
  previewDocument: PreviewDocument;
  onPreviewDocumentChange: (document: PreviewDocument) => void;
  /* Device stays with the caller. Switching views unmounts this canvas, so
     state held here would reset each time you looked away. */
  device: PreviewDevice;
  styleOf: (role: TypeRole) => CSSProperties;
  /** The palette half of the workspace, generated. Empty when there is none. */
  tracks: ColorTrack[];
  textShade: ShadeRef | null;
  backgroundShade: ShadeRef | null;
  onTextShadeChange: (ref: ShadeRef | null) => void;
  onBackgroundShadeChange: (ref: ShadeRef | null) => void;
}

export function TypographyPreview({
  system,
  roles,
  view,
  unit,
  remRootPx,
  specimenText,
  onSpecimenTextChange,
  previewDocument,
  onPreviewDocumentChange,
  device,
  styleOf,
  tracks,
  textShade,
  backgroundShade,
  onTextShadeChange,
  onBackgroundShadeChange,
}: TypographyPreviewProps) {
  const textHex = resolveShadeHex(tracks, textShade);
  const backgroundHex = resolveShadeHex(tracks, backgroundShade);
  const documentOpen = view === "preview";

  const preview = (
    <section aria-label="Type scale preview" className={styles.previewPage}>
      <div className={styles.previewToolbar}>
        <Toolbar
          gap={1}
          label="Preview"
          size="sm"
          startContent={
            <>
              <PreviewColourControls
                background={backgroundShade}
                text={textShade}
                tracks={tracks}
                onBackgroundChange={onBackgroundShadeChange}
                onTextChange={onTextShadeChange}
              />
              {documentOpen ? <PreviewDocumentToolbar /> : null}
            </>
          }
        />
      </div>

      <div
        className={styles.previewStage}
        data-preview-background={backgroundHex ? "true" : undefined}
        data-preview-text={textHex ? "true" : undefined}
        data-preview-device={device.id}
        style={{
          maxWidth: `${device.widthPx}px`,
          /* Colour lives on each card, not on this box. Painting the stage
             put a square behind the rounded cards and, with overflow hidden,
             ate the wheel so the page could not scroll. */
          ...(backgroundHex
            ? ({ "--preview-surface": backgroundHex } as CSSProperties)
            : {}),
          ...(textHex
            ? ({ color: textHex, "--preview-ink": textHex } as CSSProperties)
            : {}),
        }}
      >
        {documentOpen ? (
          <article
            className={`${styles.templateSurface} ${styles.templateDocument}`}
          >
            <PreviewDocumentCanvas />
          </article>
        ) : (
          <PreviewSpecimenList
            backgroundHex={backgroundHex}
            device={device}
            remRootPx={remRootPx}
            roles={roles}
            specimenText={specimenText}
            onSpecimenTextChange={onSpecimenTextChange}
            styleOf={styleOf}
            system={system}
            textHex={textHex}
            unit={unit}
          />
        )}
      </div>
    </section>
  );

  if (!documentOpen) return preview;

  return (
    <PreviewDocumentSession
      document={previewDocument}
      styleOf={styleOf}
      system={system}
      onDocumentChange={onPreviewDocumentChange}
    >
      {preview}
    </PreviewDocumentSession>
  );
}
