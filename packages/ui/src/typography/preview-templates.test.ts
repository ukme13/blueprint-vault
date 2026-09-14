import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleTemplate } from "./article-template";
import { DashboardTemplate } from "./dashboard-template";
import { DocumentationTemplate } from "./documentation-template";
import { EmailTemplate } from "./email-template";
import {
  PREVIEW_TEMPLATE_IDS,
  readPreviewTemplate,
  type TemplateProps,
} from "./preview-template-shared";
import { SEMANTIC_ROLES, type SemanticRole } from "./types";

const LAYOUTS: Array<{
  name: string;
  Component: ComponentType<TemplateProps>;
  english: string;
  thai: string;
}> = [
  {
    name: "article",
    Component: ArticleTemplate,
    english: "A type scale is a set of decisions, not a set of sizes",
    thai: "สเกลตัวอักษรคือชุดการตัดสินใจ ไม่ใช่แค่ชุดของขนาด",
  },
  {
    name: "dashboard",
    Component: DashboardTemplate,
    english: "Open files",
    thai: "ไฟล์ที่เปิด",
  },
  {
    name: "documentation",
    Component: DocumentationTemplate,
    english: "Roles, not a ramp of sizes",
    thai: "บทบาท ไม่ใช่ลำดับขนาด",
  },
  {
    name: "email",
    Component: EmailTemplate,
    english: "Your type scale is ready to export",
    thai: "สเกลตัวอักษรพร้อมส่งออกแล้ว",
  },
];

function render(
  Component: ComponentType<TemplateProps>,
  props: Partial<TemplateProps> = {},
) {
  const called: SemanticRole[] = [];
  const markup = renderToStaticMarkup(
    createElement(Component, {
      styleFor: (role) => {
        called.push(role);
        return {};
      },
      ...props,
    }),
  );
  return { markup, called };
}

describe("preview templates", () => {
  it("lists the layouts the studio still has, specimen first", () => {
    expect(PREVIEW_TEMPLATE_IDS).toEqual(["specimen", "article"]);
  });

  it("opens a stored documentation or email layout as article", () => {
    expect(readPreviewTemplate("documentation")).toBe("article");
    expect(readPreviewTemplate("email")).toBe("article");
    expect(readPreviewTemplate("article")).toBe("article");
    expect(readPreviewTemplate("dashboard")).toBe("specimen");
    expect(readPreviewTemplate(undefined)).toBe("specimen");
  });

  it.each(LAYOUTS)(
    "$name canned English copy is written for Blueprint",
    ({ Component, english }) => {
      const { markup } = render(Component);
      expect(markup).toContain(english);
      expect(markup).not.toContain("lorem");
    },
  );

  it.each(LAYOUTS)(
    "$name ships Thai copy marked as Thai",
    ({ Component, thai }) => {
      const { markup } = render(Component, { lang: "th" });
      expect(markup).toContain(thai);
      expect(markup).toContain('lang="th"');
    },
  );

  it.each(LAYOUTS)(
    "$name puts one title at the host heading level",
    ({ Component }) => {
      const { markup } = render(Component);
      expect(markup.match(/<h1\b/g)).toHaveLength(1);

      const nested = render(Component, { headingLevel: 3 }).markup;
      expect(nested).not.toMatch(/<h1\b/);
      expect(nested.match(/<h3\b/g)?.length).toBeGreaterThanOrEqual(1);
    },
  );

  it.each(LAYOUTS)("$name asks for every semantic role", ({ Component }) => {
    const { called } = render(Component);
    expect(new Set(called)).toEqual(new Set(SEMANTIC_ROLES));
  });

  it("drops the canned sidebar when a document is passed in", () => {
    const { markup } = render(DocumentationTemplate, {
      children: "studio document",
    });
    expect(markup).toContain("studio document");
    expect(markup).not.toContain("Foundations");
    expect(markup).not.toContain("On this page");
  });
});
