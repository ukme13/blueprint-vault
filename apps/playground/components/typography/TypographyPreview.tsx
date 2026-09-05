"use client";

import type { CSSProperties } from "react";
import {
  assessTextContrastAtSize,
  Button,
  elementForRole,
  formatLength,
  type SemanticRole,
  type TypeRole,
  type TypeScaleUnit,
  type ColorTrack,
  type TypeSystem,
  resolveLineHeight,
} from "@blueprint/ui";
import {
  ArticleTemplate,
  MarketingTemplate,
  PREVIEW_TEMPLATES,
  PREVIEW_WIDTH_OPTIONS,
  PREVIEW_WIDTHS,
  specimenTextForRole,
  type PreviewLanguage,
  type PreviewTemplateId,
  type PreviewWidth,
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
  marketing: styles.templateMarketing,
  features: styles.templateFeatures,
};

export interface TypographyPreviewProps {
  /** Resolved, so elementForRole reads the sizes the preview actually shows. */
  system: TypeSystem;
  /** Largest first. */
  roles: TypeRole[];
  template: PreviewTemplateId;
  unit: TypeScaleUnit;
  specimenText: string;
  /* Width and language stay with the caller. This section unmounts on every
     tab switch, so state held here would reset each time you looked away. */
  width: PreviewWidth;
  lang: PreviewLanguage;
  /** Resolved CSS per role, so templates never do scale maths themselves. */
  /* Two questions, and they are not the same one. A template asks which role
     should draw its heading slot; the specimen list already has a role and
     asks what it looks like. Folding them into one function is what let the
     slot chain answer for a concrete role and land every one of them on
     body. */
  styleFor: (slot: SemanticRole) => CSSProperties;
  styleOf: (role: TypeRole) => CSSProperties;
  onTemplateChange: (template: PreviewTemplateId) => void;
  onWidthChange: (width: PreviewWidth) => void;
  onLangChange: (lang: PreviewLanguage) => void;
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
  width,
  lang,
  styleFor,
  styleOf,
  onTemplateChange,
  onWidthChange,
  onLangChange,
  tracks,
  textShade,
  backgroundShade,
  onTextShadeChange,
  onBackgroundShadeChange,
}: TypographyPreviewProps) {
  const textHex = resolveShadeHex(tracks, textShade);
  const backgroundHex = resolveShadeHex(tracks, backgroundShade);
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
        <div
          className={styles.previewControlGroup}
          role="group"
          aria-label="Preview width"
        >
          {PREVIEW_WIDTH_OPTIONS.map((entry) => (
            <Button
              key={entry.id}
              aria-pressed={width === entry.id}
              scheme="neutral"
              size="xs"
              variant={width === entry.id ? "contained" : "outlined"}
              onClick={() => onWidthChange(entry.id)}
            >
              {entry.label}
            </Button>
          ))}
        </div>
        <div
          className={styles.previewControlGroup}
          role="group"
          aria-label="Preview language"
        >
          {(["en", "th"] as PreviewLanguage[]).map((code) => (
            <Button
              key={code}
              aria-pressed={lang === code}
              scheme="neutral"
              size="xs"
              variant={lang === code ? "contained" : "outlined"}
              onClick={() => onLangChange(code)}
            >
              {code === "en" ? "English" : "ไทย"}
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
        data-preview-colours={textHex && backgroundHex ? "true" : undefined}
        style={{
          maxWidth: `${PREVIEW_WIDTHS[width]}px`,
          /* Only set when chosen, so an unpicked colour keeps inheriting the
             studio chrome rather than being forced to a default. */
          ...(backgroundHex ? { background: backgroundHex } : {}),
          ...(textHex ? { color: textHex } : {}),
        }}
      >
        {template === "article" && (
          <ArticleTemplate
            classNames={TEMPLATE_CLASSES}
            lang={lang}
            styleFor={styleFor}
          />
        )}
        {template === "marketing" && (
          <MarketingTemplate
            classNames={TEMPLATE_CLASSES}
            lang={lang}
            styleFor={styleFor}
          />
        )}
        {template === "specimen" &&
          roles.map((role) => {
            /* Sample copy exists for the six original roles; an arbitrary
               role falls back through its group to the specimen text. The
               copy and the chain both live in the package now, because the
               documentation renders the same specimens and a second copy of
               the Thai would be a second thing to get right. */
            const text = specimenTextForRole(role, lang, specimenText);
            const Tag = elementForRole(system, role);
            /* Judged at this role's own size and weight: the same pair of
               colours passes at a heading and fails at a caption. */
            const contrast =
              textHex && backgroundHex
                ? assessTextContrastAtSize(
                    textHex,
                    backgroundHex,
                    role.desktop.fontSizePx,
                    role.fontWeight,
                  )
                : null;

            return (
              <article key={role.id} className={styles.previewRole}>
                <header>
                  <h3>{role.id}</h3>
                  <p>
                    {formatLength(role.desktop.fontSizePx, unit)} · weight{" "}
                    {role.fontWeight} · line height{" "}
                    {resolveLineHeight(role).computedLineHeightPx}px ·{" "}
                    {elementForRole(system, role)}
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
                <Tag style={styleOf(role)}>{text}</Tag>
              </article>
            );
          })}
      </div>
    </section>
  );
}
