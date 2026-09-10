"use client";

import type { CSSProperties } from "react";
import {
  assessTextContrastAtSize,
  ArticleTemplate,
  Button,
  elementForRole,
  formatLength,
  generateTypeSteps,
  type SemanticRole,
  type TypeRole,
  type TypeScaleUnit,
  type ColorTrack,
  type TypeSystem,
  resolveLineHeight,
  resolveRoleSizePx,
  PREVIEW_TEMPLATES,
  type PreviewTemplateId,
  type PreviewDevice,
} from "@blueprint/ui";
import {
  PreviewColourControls,
  resolveShadeHex,
  type ShadeRef,
} from "./PreviewColourControls";
import styles from "./typography-workspace.module.css";

/* The templates' layout is the studio's, not the package's. They render inside
   a resizable preview stage here and inside a document column in the
   documentation, so the classes travel as a prop rather than as a stylesheet
   nobody else wanted. */
const TEMPLATE_CLASSES = {
  article: styles.templateArticle,
};

export interface TypographyPreviewProps {
  /** Resolved, so elementForRole reads the sizes the preview actually shows. */
  system: TypeSystem;
  /** Largest first. */
  roles: TypeRole[];
  template: PreviewTemplateId;
  unit: TypeScaleUnit;
  specimenText: string;
  /* Device stays with the caller. Switching Editor/Preview unmounts this
     canvas, so state held here would reset each time you looked away. */
  device: PreviewDevice;
  /** Resolved CSS per role, so templates never do scale maths themselves. */
  /* Two questions, and they are not the same one. A template asks which role
     should draw its heading slot; the specimen list already has a role and
     asks what it looks like. Folding them into one function is what let the
     slot chain answer for a concrete role and land every one of them on
     body. */
  styleFor: (slot: SemanticRole) => CSSProperties;
  styleOf: (role: TypeRole) => CSSProperties;
  onTemplateChange: (template: PreviewTemplateId) => void;
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
  template,
  unit,
  specimenText,
  device,
  styleFor,
  styleOf,
  onTemplateChange,
  tracks,
  textShade,
  backgroundShade,
  onTextShadeChange,
  onBackgroundShadeChange,
}: TypographyPreviewProps) {
  const textHex = resolveShadeHex(tracks, textShade);
  const backgroundHex = resolveShadeHex(tracks, backgroundShade);
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    device.ratio,
    system.stepCount,
  );
  return (
    <section aria-label="Type scale preview" className={styles.previewPage}>
      <div
        className={styles.previewControls}
        role="group"
        aria-label="Preview options"
      >
        <div
          className={styles.previewControlGroup}
          role="group"
          aria-label="Template"
        >
          {PREVIEW_TEMPLATES.map((entry) => (
            <Button
              key={entry.id}
              aria-pressed={template === entry.id}
              scheme="neutral"
              size="xs"
              variant={template === entry.id ? "contained" : "outlined"}
              onClick={() => onTemplateChange(entry.id)}
            >
              {entry.label}
            </Button>
          ))}
        </div>
      </div>

      <PreviewColourControls
        background={backgroundShade}
        text={textShade}
        tracks={tracks}
        onBackgroundChange={onBackgroundShadeChange}
        onTextChange={onTextShadeChange}
      />

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
          ...(textHex ? { color: textHex } : {}),
        }}
      >
        {template === "article" && (
          <ArticleTemplate
            classNames={TEMPLATE_CLASSES}
            styleFor={styleFor}
            text={specimenText}
          />
        )}
        {template === "specimen" &&
          roles.map((role) => {
            const Tag = elementForRole(system, role);
            const fontSizePx = resolveRoleSizePx(
              system,
              steps,
              role,
              device.id,
            );
            /* Judged at this role's own size and weight: the same pair of
               colours passes at a heading and fails at a caption. */
            const contrast =
              textHex && backgroundHex
                ? assessTextContrastAtSize(
                    textHex,
                    backgroundHex,
                    fontSizePx,
                    role.fontWeight,
                  )
                : null;

            return (
              <article key={role.id} className={styles.previewRole}>
                <header>
                  <h3>{role.id}</h3>
                  <p>
                    {formatLength(fontSizePx, unit)} · weight {role.fontWeight}{" "}
                    · line height{" "}
                    {
                      resolveLineHeight(role, fontSizePx, device.id)
                        .computedLineHeightPx
                    }
                    px · {elementForRole(system, role)}
                  </p>
                  {contrast && (
                    <p
                      className={styles.previewContrast}
                      data-status={contrast.status}
                    >
                      {contrast.ratio.toFixed(2)}:1 · {contrast.summary}
                    </p>
                  )}
                </header>
                <Tag style={styleOf(role)}>{specimenText}</Tag>
              </article>
            );
          })}
      </div>
    </section>
  );
}
