import type { CSSProperties } from "react";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  specimenTextForRole,
  typeFontRows,
  typeRoleRowGroups,
  type TypeFontRow,
  type TypeRoleRow,
  type TypeSystem,
} from "@blueprint/ui";

/**
 * Each role rendered as its real element, at its real size, in both scripts.
 *
 * The table above says a role is 32px in Geist Sans at weight 700. This is
 * what that looks like, which is the half a table cannot carry — and it is
 * rendered as the element the role maps to, so a heading really is an `h2` in
 * the document outline rather than a paragraph dressed as one.
 *
 * Raw elements with inline styles, deliberately, and the one place on these
 * pages that is true. Astryx's `Text` and `Heading` apply the theme's own type
 * tokens, which is right for the chrome around a specimen and exactly wrong
 * for the specimen: a page that showed the workspace's sizes through Astryx's
 * font would be documenting Astryx. The studio's preview templates do the same
 * thing for the same reason.
 *
 * Thai beside English because a scale that reads well in Latin can still crowd
 * Thai marks — the ascenders and the tone marks stack above the line, and a
 * line height chosen at a glance in English is where they collide.
 */

interface TypeSpecimensProps {
  system: TypeSystem;
}

/** The CSS a role resolves to, as the browser will apply it. */
export function specimenStyle(row: TypeRoleRow): CSSProperties {
  return {
    fontFamily: row.fontStack,
    fontSize: `${row.fontSizePx}px`,
    fontWeight: row.fontWeight,
    lineHeight: row.lineHeight,
    letterSpacing: `${row.letterSpacingPx}px`,
    textTransform: row.textTransform as CSSProperties["textTransform"],
    margin: 0,
  };
}

/**
 * What a reader is owed when a font cannot be drawn here.
 *
 * A Google family loads and renders. A system family renders wherever it
 * happens to be installed, and on a machine without it the specimen is a
 * fallback — true of the reader's machine, not of the design system. An
 * uploaded family cannot render at all: the workspace stores names, never
 * bytes, so the file is not in the file. That is the uploaded-fonts rule that
 * a missing file is a normal state rather than an error, and saying so is the
 * difference between a specimen and a specimen that lies.
 */
function FontNote({ font }: { font: TypeFontRow }) {
  if (font.availability === "google") return null;

  return (
    <Text as="p" color="secondary" display="block" type="supporting">
      {font.availability === "local"
        ? `${font.primary} is a font file somebody uploaded to the studio. A workspace stores font names and never the file, so it cannot be shown here — the specimens below fall through this role's stack to ${font.families[1] ?? "the browser default"}.`
        : `${font.primary} is neither a Google family nor an uploaded file, so it renders only where it is already installed. If the specimens below do not look like it, this machine does not have it and the stack has fallen through.`}
    </Text>
  );
}

/**
 * A specimen's heading level, which is not its element.
 *
 * The plan asked for each role rendered as its real element, and that is
 * right: the `h2` role has to be an `h2` here or the page is describing
 * something it is not showing. But seven roles rendered as h1 through h6 land
 * in the outline of a page that already has its own title, and a reader
 * arriving by heading navigation gets eight top-level headings, six of which
 * are the words "Build a stable type scale".
 *
 * So the tag stays and the announced level moves. `aria-level` on a heading
 * element overrides the level without touching the element, which is exactly
 * the distinction here — the specimen is a sample of a heading rather than a
 * heading of this document. Level 4 puts every one of them under the page
 * title, the "Specimens" section and its group label, which is where they
 * sit visually.
 *
 * This was not in the plan and is the cost of the plan's own instruction. It
 * is only needed for the heading roles; a paragraph specimen is a paragraph
 * either way.
 */
const SPECIMEN_HEADING_LEVEL = 4;

function Specimen({ row }: { row: TypeRoleRow }) {
  const Element = row.element;
  const style = specimenStyle(row);
  /* A paragraph carries no level to override. */
  const outline =
    Element === "p"
      ? {}
      : { role: "heading" as const, "aria-level": SPECIMEN_HEADING_LEVEL };

  return (
    <VStack gap={2}>
      <Text color="secondary" type="code">
        {row.id} · {row.fontSizePx}px · {row.fontWeight} · {row.lineHeight}
      </Text>
      {/* The same element the role exports as, so the outline this page shows
          is the outline a product using the role would get. */}
      <Element style={style} {...outline}>
        {specimenTextForRole(row, "en", row.name)}
      </Element>
      <Element lang="th" style={style} {...outline}>
        {specimenTextForRole(row, "th", row.name)}
      </Element>
    </VStack>
  );
}

export function TypeSpecimens({ system }: TypeSpecimensProps) {
  /* One note per family, not per font entry. This workspace has two entries,
     Display and Main, both pointing at the same stack — so the note appeared
     twice, word for word, which reads as a rendering fault rather than as two
     entries agreeing. The note is about the family, so the family is the key. */
  const notes = [
    ...new Map(
      typeFontRows(system).map((font) => [
        `${font.primary}|${font.availability}`,
        font,
      ]),
    ).values(),
  ];

  return (
    <VStack gap={5}>
      {notes.map((font) => (
        <FontNote font={font} key={font.id} />
      ))}

      {typeRoleRowGroups(system).map((group) => (
        <section key={group.id} aria-labelledby={`specimen-${group.id}`}>
          <VStack gap={4}>
            <Text
              as="p"
              display="block"
              id={`specimen-${group.id}`}
              type="label"
              weight="semibold"
            >
              {group.label}
            </Text>
            {group.rows.map((row) => (
              <Specimen key={row.id} row={row} />
            ))}
          </VStack>
        </section>
      ))}
    </VStack>
  );
}
