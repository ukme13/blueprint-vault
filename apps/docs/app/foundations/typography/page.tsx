import type { Metadata } from "next";
import {
  googleFontsHref,
  typeFontRows,
  typeRoleRowGroups,
  resolveTemplateSlot,
  ArticleTemplate,
  type SemanticRole,
} from "@blueprint/ui";
import { TYPOGRAPHY_GUIDANCE } from "../../../content/typography";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import { TypeRoleTable } from "../../../components/TypeRoleTable";
import { TypeScaleTable } from "../../../components/TypeScaleTable";
import {
  specimenStyle,
  TypeSpecimens,
} from "../../../components/TypeSpecimens";
import { readReferenceWorkspace } from "../../../lib/workspace";

export const metadata: Metadata = { title: "Typography" };

/**
 * The type system: the scale that generated it, what each size is for, and
 * what it looks like.
 *
 * Static, and rendered from the workspace file at build time, like the colour
 * pages next door. Nothing here is written down — change the base size in the
 * reference workspace and every number, every specimen and the article at the
 * bottom all move.
 *
 * Order matters and is the plan's: guidance, then the scale, then the roles,
 * then the specimens. A developer arriving for a variable name finds the table
 * without reading the prose; a designer arriving to judge the scale reaches the
 * specimens having been told what a role is. A page that opened with specimens
 * would be a font poster.
 */

/* The templates' layout is the host's. In the studio they sit in a resizable
   preview stage; here they are a document, so this is a column with the same
   rhythm as the rest of the page. */
const TEMPLATE_CLASSES = {
  article: "flex flex-col gap-4",
};

export default function TypographyFoundationPage() {
  const { project } = readReferenceWorkspace();
  const system = project.typography?.system;

  if (!system) {
    /* A workspace with no type system is a real file, not a broken one: the
       studio writes each slice when somebody first opens it. Saying so beats
       an empty page or a crashed build. */
    return (
      <FoundationsFrame
        path="foundations/typography"
        sections={[
          {
            heading: "No type system yet",
            paragraphs: [
              "The reference workspace carries no typography slice, so there is nothing to describe. Open the type scale studio and save once, and this page fills in.",
            ],
          },
        ]}
        summary="This workspace has no type system yet."
        title="Typography"
      />
    );
  }

  const rows = typeRoleRowGroups(system).flatMap((group) => group.rows);

  /* Google families load from Google. A workspace naming none renders no link
     at all rather than an empty stylesheet request — and a family that is
     neither Google nor uploaded is left to the reader's machine, which
     `FontNote` says out loud rather than letting a fallback pass for the
     font. */
  const fontsHref = googleFontsHref(
    typeFontRows(system)
      .flatMap((font) => font.googleFamilies)
      .map((family) => ({ family })),
  );

  /* Which role draws each slot is `resolveTemplateSlot` in the package, the
     same function the studio's preview uses. The six names a template asks
     for are the ones the system shipped with, and this workspace has none of
     them but `body` — so before the resolver, five of six slots landed on
     body and the article below rendered flat. */
  const styleForSlot = (slot: SemanticRole) => {
    const role = resolveTemplateSlot(system, slot);
    const row = role && rows.find((candidate) => candidate.id === role.id);
    return row ? specimenStyle(row) : {};
  };

  return (
    <FoundationsFrame
      path="foundations/typography"
      summary={`The type scale ${project.name} generates, what each role is for, and the names a developer installs them under.`}
      sections={[
        ...TYPOGRAPHY_GUIDANCE,
        {
          heading: "The scale",
          body: (
            <>
              {/* Hoisted into the head by Next. Only rendered when the
                  workspace actually names a Google family. */}
              {fontsHref && <link href={fontsHref} rel="stylesheet" />}
              <TypeScaleTable system={system} />
            </>
          ),
        },
        { heading: "The roles", body: <TypeRoleTable system={system} /> },
        { heading: "Specimens", body: <TypeSpecimens system={system} /> },
        {
          heading: "The scale doing a job",
          paragraphs: [
            "The same roles in an article, which is where a scale either holds together or does not. This is the studio's own preview template, rendered against this workspace.",
          ],
          body: (
            <>
              <ArticleTemplate
                classNames={TEMPLATE_CLASSES}
                headingLevel={3}
                lang="en"
                styleFor={styleForSlot}
              />
              <ArticleTemplate
                classNames={TEMPLATE_CLASSES}
                headingLevel={3}
                lang="th"
                styleFor={styleForSlot}
              />
            </>
          ),
        },
      ]}
      title="Typography"
    />
  );
}
