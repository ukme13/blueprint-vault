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
  type PreviewLanguage,
  type PreviewTemplateId,
  type PreviewWidth,
} from "./preview-templates";
import {
  PreviewColourControls,
  resolveShadeHex,
  type ShadeRef,
} from "./PreviewColourControls";
import styles from "./typography-workspace.module.css";

const PREVIEW_TEXT: Record<SemanticRole, { en: string; th: string }> = {
  display: { en: "Design with clarity", th: "ออกแบบด้วยความชัดเจน" },
  heading: {
    en: "Build a stable type scale",
    th: "สร้างสเกลตัวอักษรที่มั่นคง",
  },
  title: {
    en: "Semantic roles, not raw sizes",
    th: "บทบาทเชิงความหมาย ไม่ใช่ขนาดดิบ",
  },
  body: {
    en: "Blueprint generates a modular scale from a base size and ratio, then maps each step to a semantic role so components stay consistent.",
    th: "Blueprint สร้างสเกลตัวอักษรจากขนาดฐานและอัตราส่วน แล้วจับคู่แต่ละขั้นกับบทบาทเชิงความหมาย เพื่อให้คอมโพเนนต์มีความสม่ำเสมอ",
  },
  label: { en: "Field label", th: "ป้ายกำกับฟิลด์" },
  caption: { en: "Last updated a moment ago", th: "อัปเดตล่าสุดเมื่อสักครู่" },
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
  styleFor: (roleId: string) => CSSProperties;
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
          <ArticleTemplate lang={lang} styleFor={styleFor} />
        )}
        {template === "marketing" && (
          <MarketingTemplate lang={lang} styleFor={styleFor} />
        )}
        {template === "specimen" &&
          roles.map((role) => {
            /* Sample copy exists for the six original roles. An arbitrary role
               falls back to the specimen text, which is always set. */
            const sample = PREVIEW_TEXT[role.id as SemanticRole];
            const text = sample
              ? lang === "th"
                ? sample.th
                : sample.en
              : specimenText || role.name;
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
                <Tag style={styleFor(role.id)}>{text}</Tag>
              </article>
            );
          })}
      </div>
    </section>
  );
}
