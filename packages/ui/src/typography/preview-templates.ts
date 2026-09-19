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

import type { SemanticRole } from "./types";
import type { PreviewLanguage } from "./preview-template-shared";

export type {
  PreviewLanguage,
  PreviewTemplateId,
  TemplateClassNames,
  TemplateProps,
} from "./preview-template-shared";
export {
  PREVIEW_TEMPLATE_IDS,
  readPreviewTemplate,
} from "./preview-template-shared";
export { ArticleTemplate } from "./article-template";
export { DashboardTemplate } from "./dashboard-template";
export { DocumentationTemplate } from "./documentation-template";
export { EmailTemplate } from "./email-template";
export * from "./preview-document";
export * from "./preview-shell";
export * from "./landing-copy";
export * from "./preview-sections";
export { ARTICLE_COPY } from "./article-copy";

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
