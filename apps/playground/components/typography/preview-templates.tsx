"use client";

import type { CSSProperties, ReactNode } from "react";
import type { SemanticRole } from "@blueprint/ui";
import styles from "./typography-workspace.module.css";

export type PreviewTemplateId = "specimen" | "article" | "marketing";
export type PreviewLanguage = "en" | "th";

export const PREVIEW_TEMPLATES: Array<{
  id: PreviewTemplateId;
  label: string;
}> = [
  { id: "specimen", label: "Specimen" },
  { id: "article", label: "Article" },
  { id: "marketing", label: "Marketing page" },
];

/** Preview widths in px. A template is judged at the width it will ship at. */
export const PREVIEW_WIDTHS = {
  mobile: 375,
  tablet: 768,
  desktop: 1120,
} as const;

export type PreviewWidth = keyof typeof PREVIEW_WIDTHS;

export const PREVIEW_WIDTH_OPTIONS: Array<{
  id: PreviewWidth;
  label: string;
}> = [
  { id: "mobile", label: "Mobile" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

export interface TemplateProps {
  /** Resolved CSS for a role, so templates never do scale maths themselves. */
  styleFor: (role: SemanticRole) => CSSProperties;
  lang: PreviewLanguage;
}

/**
 * Copy is written for Blueprint. Templates exist to show the scale doing a real
 * job, so the text is realistic rather than lorem ipsum, and every template has
 * a Thai version: a scale that reads well in English can still crowd Thai marks.
 */
const ARTICLE = {
  en: {
    kicker: "Design systems",
    title: "A type scale is a set of decisions, not a set of sizes",
    standfirst:
      "Choosing a ratio is the easy part. The work is deciding what each size is for, and holding that line as a product grows.",
    byline: "Blueprint team",
    headingOne: "Start from the reading size",
    bodyOne:
      "Body text is the size most people spend the most time with, so it should be chosen first and everything else derived from it. Picking a display size first tends to produce scales that look impressive in a specimen and read badly in a paragraph.",
    headingTwo: "Give every step a job",
    bodyTwo:
      "A step that has no purpose will be used for something eventually, and usually for the wrong thing. Fewer, well-named sizes are easier to hold to than a long ramp of near-identical values.",
    quote:
      "If two sizes are close enough that nobody can tell them apart, they are not two sizes.",
    caption: "Figure 1 — the same paragraph set at three neighbouring steps",
  },
  th: {
    kicker: "ระบบการออกแบบ",
    title: "สเกลตัวอักษรคือชุดการตัดสินใจ ไม่ใช่แค่ชุดของขนาด",
    standfirst:
      "การเลือกอัตราส่วนเป็นเรื่องง่าย งานจริงคือการตัดสินใจว่าแต่ละขนาดมีไว้เพื่ออะไร และรักษาเส้นนั้นไว้เมื่อผลิตภัณฑ์เติบโตขึ้น",
    byline: "ทีม Blueprint",
    headingOne: "เริ่มจากขนาดที่ใช้อ่าน",
    bodyOne:
      "ข้อความเนื้อหาคือขนาดที่คนใช้เวลากับมันมากที่สุด จึงควรเลือกก่อนแล้วค่อยคำนวณขนาดอื่นจากตรงนั้น การเลือกขนาดพาดหัวก่อนมักได้สเกลที่ดูดีในหน้าตัวอย่างแต่อ่านยากในย่อหน้าจริง",
    headingTwo: "ให้ทุกขั้นมีหน้าที่ของมัน",
    bodyTwo:
      "ขั้นที่ไม่มีจุดประสงค์จะถูกนำไปใช้กับบางอย่างในที่สุด และมักเป็นสิ่งที่ผิด ขนาดที่น้อยลงแต่ตั้งชื่อไว้ดีย่อมรักษาได้ง่ายกว่าลำดับขนาดยาวที่ใกล้เคียงกันไปหมด",
    quote: "ถ้าสองขนาดใกล้กันจนไม่มีใครแยกออก นั่นก็ไม่ใช่สองขนาด",
    caption: "ภาพที่ 1 — ย่อหน้าเดียวกันจัดด้วยสามขั้นที่อยู่ติดกัน",
  },
} as const;

const MARKETING = {
  en: {
    eyebrow: "Blueprint",
    title: "Build a palette and a type scale that agree with each other",
    subtitle:
      "One workspace for colour and type, exporting tokens your components can actually use.",
    featureOneTitle: "Stable intervals",
    featureOneBody:
      "Shades land on a fixed grid, so a token means the same thing in every theme.",
    featureTwoTitle: "Readable by default",
    featureTwoBody:
      "Sizes export in rem, so text still respects a reader's browser settings.",
    featureThreeTitle: "Checked as you go",
    featureThreeBody:
      "Contrast and line-height warnings appear while you edit, not after you ship.",
    smallPrint: "Tokens export as CSS, Tailwind, and design tokens.",
  },
  th: {
    eyebrow: "Blueprint",
    title: "สร้างชุดสีและสเกลตัวอักษรที่สอดคล้องกัน",
    subtitle:
      "พื้นที่ทำงานเดียวสำหรับสีและตัวอักษร ส่งออกโทเคนที่คอมโพเนนต์ใช้งานได้จริง",
    featureOneTitle: "ช่วงที่คงที่",
    featureOneBody:
      "เฉดสีอยู่บนกริดที่กำหนดไว้ โทเคนหนึ่งจึงมีความหมายเดียวกันในทุกธีม",
    featureTwoTitle: "อ่านง่ายตั้งแต่ต้น",
    featureTwoBody:
      "ขนาดส่งออกเป็น rem ข้อความจึงยังเคารพการตั้งค่าเบราว์เซอร์ของผู้อ่าน",
    featureThreeTitle: "ตรวจสอบระหว่างทาง",
    featureThreeBody:
      "คำเตือนเรื่องคอนทราสต์และความสูงบรรทัดแสดงขณะแก้ไข ไม่ใช่หลังส่งงาน",
    smallPrint: "ส่งออกโทเคนเป็น CSS, Tailwind และ design tokens",
  },
} as const;

function Field({
  children,
  lang,
}: {
  children: ReactNode;
  lang: PreviewLanguage;
}) {
  return lang === "th" ? <span lang="th">{children}</span> : <>{children}</>;
}

export function ArticleTemplate({ styleFor, lang }: TemplateProps) {
  const copy = ARTICLE[lang];

  return (
    <article className={styles.templateArticle}>
      <p style={styleFor("label")}>
        <Field lang={lang}>{copy.kicker}</Field>
      </p>
      <h1 style={styleFor("display")}>
        <Field lang={lang}>{copy.title}</Field>
      </h1>
      <p style={styleFor("title")}>
        <Field lang={lang}>{copy.standfirst}</Field>
      </p>
      <p style={styleFor("caption")}>
        <Field lang={lang}>{copy.byline}</Field>
      </p>

      <h2 style={styleFor("heading")}>
        <Field lang={lang}>{copy.headingOne}</Field>
      </h2>
      <p style={styleFor("body")}>
        <Field lang={lang}>{copy.bodyOne}</Field>
      </p>

      <blockquote style={styleFor("title")}>
        <Field lang={lang}>{copy.quote}</Field>
      </blockquote>

      <h2 style={styleFor("heading")}>
        <Field lang={lang}>{copy.headingTwo}</Field>
      </h2>
      <p style={styleFor("body")}>
        <Field lang={lang}>{copy.bodyTwo}</Field>
      </p>

      <figure>
        <figcaption style={styleFor("caption")}>
          <Field lang={lang}>{copy.caption}</Field>
        </figcaption>
      </figure>
    </article>
  );
}

export function MarketingTemplate({ styleFor, lang }: TemplateProps) {
  const copy = MARKETING[lang];
  const features = [
    { title: copy.featureOneTitle, body: copy.featureOneBody },
    { title: copy.featureTwoTitle, body: copy.featureTwoBody },
    { title: copy.featureThreeTitle, body: copy.featureThreeBody },
  ];

  return (
    <article className={styles.templateMarketing}>
      <header>
        <p style={styleFor("label")}>
          <Field lang={lang}>{copy.eyebrow}</Field>
        </p>
        <h1 style={styleFor("display")}>
          <Field lang={lang}>{copy.title}</Field>
        </h1>
        <p style={styleFor("title")}>
          <Field lang={lang}>{copy.subtitle}</Field>
        </p>
      </header>

      <ul className={styles.templateFeatures}>
        {features.map((feature) => (
          <li key={feature.title}>
            <h2 style={styleFor("heading")}>
              <Field lang={lang}>{feature.title}</Field>
            </h2>
            <p style={styleFor("body")}>
              <Field lang={lang}>{feature.body}</Field>
            </p>
          </li>
        ))}
      </ul>

      <footer>
        <p style={styleFor("caption")}>
          <Field lang={lang}>{copy.smallPrint}</Field>
        </p>
      </footer>
    </article>
  );
}
