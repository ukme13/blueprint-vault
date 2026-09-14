import type { CSSProperties, ReactNode } from "react";
import type { SemanticRole } from "./types";

export type PreviewTemplateId = "specimen" | "article";

export type PreviewLanguage = "en" | "th";

export const PREVIEW_TEMPLATE_IDS: readonly PreviewTemplateId[] = [
  "specimen",
  "article",
];

/**
 * Layouts the studio no longer offers as views.
 *
 * Documentation was the same editable document as Article once the fake
 * sidebar left. Email was a chrome wrapper around that document. A save
 * that still names either should open the article, not the specimen list.
 */
const RETIRED_PREVIEW_TEMPLATES: Record<string, PreviewTemplateId> = {
  documentation: "article",
  email: "article",
};

/** A stored view id, or specimen when the name is unknown. */
export function readPreviewTemplate(
  value: string | undefined,
): PreviewTemplateId {
  if (!value) return "specimen";
  const retired = RETIRED_PREVIEW_TEMPLATES[value];
  if (retired) return retired;
  return PREVIEW_TEMPLATE_IDS.includes(value as PreviewTemplateId)
    ? (value as PreviewTemplateId)
    : "specimen";
}

/**
 * Layout classes the host supplies.
 *
 * The templates moved here when a second application needed them, and their
 * layout rules did not: they were a CSS module in the studio, and a package
 * that shipped its own stylesheet would be deciding what a gap is for every
 * app that renders one. This is the same arrangement Button already has — the
 * caller's className is the only thing that draws pixels — and it is what
 * lets the documentation set an article in its own column while the studio
 * sets it inside a resizable preview stage.
 *
 * Every field is optional: a template with no classes still renders, in the
 * browser's own block layout, which is the honest default for a specimen.
 */
export interface TemplateClassNames {
  article?: string;
  dashboard?: string;
  documentation?: string;
  email?: string;
}

export interface TemplateProps {
  /** Resolved CSS for a role, so templates never do scale maths themselves. */
  styleFor: (role: SemanticRole) => CSSProperties;
  /**
   * Canned copy language when `text` is omitted.
   *
   * The documentation still ships bilingual articles. The studio passes
   * `text` instead: one specimen string, whatever the user typed.
   */
  lang?: PreviewLanguage;
  /**
   * When set, every slot renders this string.
   *
   * The studio preview shares the editor's specimen so a person types once
   * and judges the scale in the same copy, including scripts the canned
   * English/Thai pair never covered.
   */
  text?: string;
  classNames?: TemplateClassNames;
  /**
   * Where the template's own headings sit in the host's outline.
   *
   * 1 by default, which is right in the studio: the preview stage is the
   * page and the article's title is its title. On a documentation page it
   * is not — the page already has an h1 and a section h2 above it, and a
   * template rendered there contributed a second and a third. Measured on
   * `/foundations/typography`: five level-one headings, two of them the
   * article specimen and one of them its Thai twin.
   *
   * The visual size is unaffected. A heading's size comes from the role it
   * draws rather than from its tag, so this moves the outline only.
   */
  headingLevel?: 1 | 2 | 3 | 4;
  /**
   * When set, the template renders this instead of canned body copy.
   * The studio article is the document with no extra chrome.
   */
  children?: ReactNode;
}

/** The tags a template needs, for a host that sits it at `level`. */
export function headingTags(level: 1 | 2 | 3 | 4) {
  const clamp = (value: number) => Math.min(value, 6);
  return {
    Title: `h${clamp(level)}` as `h${1 | 2 | 3 | 4 | 5 | 6}`,
    Section: `h${clamp(level + 1)}` as `h${1 | 2 | 3 | 4 | 5 | 6}`,
    Sub: `h${clamp(level + 2)}` as `h${1 | 2 | 3 | 4 | 5 | 6}`,
  };
}

/** Replace every canned slot when the studio is judging one specimen string. */
export function withSpecimenText<T extends Record<string, string>>(
  copy: T,
  text?: string,
): T {
  if (!text) return copy;
  const next = { ...copy };
  for (const key of Object.keys(next) as Array<keyof T>) {
    next[key] = text as T[keyof T];
  }
  return next;
}
