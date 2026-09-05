/*
 * No "use client". These are constants and pure JSX — no state, no effects,
 * no handlers — and the directive was here only because the file used to live
 * inside the studio's client tree.
 *
 * It has to go for the documentation to render them at all. A directive marks
 * the whole module as a client boundary, so a server component calling
 * `specimenTextForRole` from it fails at build time, and passing `styleFor`
 * across that boundary would fail too: a function is not serialisable. Without
 * it these render on the server for the documentation and inside the client
 * tree for the studio, which is what a presentational component should do.
 */

import type { CSSProperties, ReactNode } from "react";
import type { SemanticRole } from "./types";

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

/**
 * Layout classes the host supplies.
 *
 * The templates moved here when a second application needed them, and their
 * three layout rules did not: they were a CSS module in the studio, and a
 * package that shipped its own stylesheet would be deciding what a gap is for
 * every app that renders one. This is the same arrangement Button already has
 * — the caller's className is the only thing that draws pixels — and it is
 * what lets the documentation set an article in its own column while the
 * studio sets it inside a resizable preview stage.
 *
 * Every field is optional: a template with no classes still renders, in the
 * browser's own block layout, which is the honest default for a specimen.
 */
export interface TemplateClassNames {
  article?: string;
  marketing?: string;
  /** The list wrapping a marketing template's feature cards. */
  features?: string;
}

export interface TemplateProps {
  /** Resolved CSS for a role, so templates never do scale maths themselves. */
  styleFor: (role: SemanticRole) => CSSProperties;
  lang: PreviewLanguage;
  classNames?: TemplateClassNames;
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

export function ArticleTemplate({ styleFor, lang, classNames }: TemplateProps) {
  const copy = ARTICLE[lang];

  return (
    <article className={classNames?.article}>
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

export function MarketingTemplate({
  styleFor,
  lang,
  classNames,
}: TemplateProps) {
  const copy = MARKETING[lang];
  const features = [
    { title: copy.featureOneTitle, body: copy.featureOneBody },
    { title: copy.featureTwoTitle, body: copy.featureTwoBody },
    { title: copy.featureThreeTitle, body: copy.featureThreeBody },
  ];

  return (
    <article className={classNames?.marketing}>
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

      <ul className={classNames?.features}>
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

/**
 * Sample copy per role, in both languages.
 *
 * Here rather than in the studio because the documentation renders the same
 * specimens, and a second copy of the Thai would be a second thing to get
 * right. Written for Blueprint rather than as lorem ipsum, for the same reason
 * the templates are: a scale is judged doing a real job.
 *
 * Keyed by the six role names the system shipped with. An arbitrary system has
 * whatever roles somebody made, which is why nothing reads this map directly —
 * `specimenTextForRole` resolves through it.
 */
export const SPECIMEN_TEXT: Record<SemanticRole, { en: string; th: string }> = {
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

/**
 * The default group ids, as the sample copy names them.
 *
 * `defaultGroups` calls the heading group `h`, because `h1` reads better than
 * `heading1` in a role list. The copy above predates that and calls it
 * `heading`. One alias rather than renaming either: the group id is a
 * project's data and the copy key is ours, and they are allowed to differ.
 */
const GROUP_SPECIMEN_ROLE: Readonly<Record<string, SemanticRole>> = {
  display: "display",
  h: "heading",
  body: "body",
};

/**
 * Sample copy for a role, falling back until something renders.
 *
 * Id, then group, then the workspace's own specimen text, then the role's
 * name. The same chain `styleForRole` follows, and for the same reason: a
 * specimen that renders nothing is worse than one showing a role's name at
 * the right size.
 */
export function specimenTextForRole(
  role: { id: string; groupId: string; name: string },
  lang: PreviewLanguage,
  fallback: string,
): string {
  const sample =
    SPECIMEN_TEXT[role.id as SemanticRole] ??
    SPECIMEN_TEXT[GROUP_SPECIMEN_ROLE[role.groupId] as SemanticRole];
  if (sample) return sample[lang];
  /* The workspace's specimen text is Latin, so a Thai specimen falling all the
     way here would silently be in English and prove nothing about Thai. The
     role's name is at least honest about having no copy. */
  if (lang === "th") return role.name;
  return fallback || role.name;
}
