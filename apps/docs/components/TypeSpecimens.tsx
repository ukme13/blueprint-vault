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
    letterSpacing: row.letterSpacingCss,
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

/*
 * A heading specimen is a heading, and the page has three of them.
 *
 * This carried `role="heading" aria-level={4}` to keep the samples out of
 * the page's outline. It did not work. Measured on the built page, Chrome
 * reports `heading "Build a stable type scale" [level=1]` for an `<h1>`
 * carrying both attributes — a native heading's implicit level wins, and
 * the override was doing nothing while looking like it did something.
 *
 * So it is gone, and the page has three level-one headings: its title and
 * the `h1` role's two specimens. That is the cost of the plan's own
 * instruction to render each role as its real element, which is right —
 * the table says `<h1>` and the specimen has to be one. Worth fixing when
 * there is an answer that keeps the element and moves the outline; there
 * is not one today, and a comment claiming otherwise is worse than the
 * three headings.
 */
function Specimen({ row }: { row: TypeRoleRow }) {
  const Element = row.element;
  const style = specimenStyle(row);
  return (
    <VStack gap={2}>
      <Text color="secondary" type="code">
        {row.id} · {row.fontSizePx}px · {row.fontWeight} · {row.lineHeight}
      </Text>
      {/* The same element the role exports as, so the outline this page shows
          is the outline a product using the role would get. */}
      <Element style={style}>
        {specimenTextForRole(row, "en", row.name)}
      </Element>
      <Element lang="th" style={style}>
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
