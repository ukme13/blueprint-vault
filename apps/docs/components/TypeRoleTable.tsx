import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  typeRoleRowGroups,
  type TypeRoleRow,
  type TypeSystem,
} from "@blueprint/ui";
import { TYPE_GROUP_GUIDANCE } from "../content/typography";
import { Prose } from "./Prose";

/**
 * Every role, grouped the way the system groups them.
 *
 * The studio's role editor draws the same rows to be edited; this one is for
 * reading. What they share is `typeRoleRowGroups` in @blueprint/ui, which
 * decides what a row is — which size a role resolves to, what element it
 * renders as, which variables it exports under. A page that resolved those
 * itself would agree with the studio until the day it did not.
 *
 * The variables are the reason this table is wide. A developer arriving here
 * wants the name to paste, and a role emits six of them; listing only the size
 * would send somebody back to the exported file to guess the other five. So
 * the facts that pair naturally share a column — a role with its element, a
 * size with its exact value, a weight with its tracking — and the variables
 * get the room that frees up.
 *
 * Composed rows rather than Astryx's data-driven mode. That mode is where its
 * "set an explicit width on every column" guidance lives, and it cannot be
 * used here at all: this is a server component, and `columns` carries a
 * `renderCell` function, which cannot cross into a client component. Tried,
 * and it fails the build rather than degrading — see `Variables` below for
 * what that costs.
 *
 * The guidance under each group comes from the content module, never from
 * here.
 */

interface TypeRoleTableProps {
  system: TypeSystem;
}

/**
 * The six variables a role exports, in the export's order.
 *
 * Allowed to wrap, which took three attempts to arrive at. A variable name
 * broken across two lines is one somebody has to reassemble before pasting,
 * so these were `nowrap` — and measured on the built page, three of them were
 * clipped at 1280px and eleven at 900px, because `.astryx-table-cell` sets
 * `overflow-x: hidden` and the table is `table-layout: auto` at the content
 * column's width. Astryx's own guidance is to give columns explicit widths,
 * but that lives in its data-driven mode, which needs a `renderCell` function
 * in props and therefore cannot be used from a server component at all.
 *
 * Wrapping is the right trade once those are the options: a wrapped name is
 * ugly and complete, a clipped one is tidy and wrong, and it is the tidy one a
 * developer copies without noticing.
 */
function Variables({ row }: { row: TypeRoleRow }) {
  return (
    <VStack gap={0}>
      {Object.values(row.variables).map((variable) => (
        <Text key={variable} type="code">
          {variable}
        </Text>
      ))}
    </VStack>
  );
}

export function TypeRoleTable({ system }: TypeRoleTableProps) {
  return (
    <>
      {typeRoleRowGroups(system).map((group) => (
        <section key={group.id} aria-labelledby={`type-group-${group.id}`}>
          <Text
            as="p"
            display="block"
            id={`type-group-${group.id}`}
            type="label"
            weight="semibold"
          >
            {group.label}
          </Text>

          {(TYPE_GROUP_GUIDANCE[group.id] ?? []).map((paragraph) => (
            <Prose key={paragraph}>{paragraph}</Prose>
          ))}

          <Table density="compact" dividers="grid" hasHover verticalAlign="top">
            <TableHeader>
              <TableRow isHeaderRow>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Font</TableHeaderCell>
                <TableHeaderCell>Size</TableHeaderCell>
                <TableHeaderCell>Line height</TableHeaderCell>
                <TableHeaderCell>Weight</TableHeaderCell>
                <TableHeaderCell>Variables</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <VStack gap={0}>
                      <Text type="code">{row.id}</Text>
                      {/* The element it renders as, which is a fact about
                            the role and not about its size. */}
                      <Text color="secondary" type="code">
                        &lt;{row.element}&gt;
                      </Text>
                    </VStack>
                  </TableCell>
                  <TableCell>
                    <VStack gap={0}>
                      <Text>{row.fontName}</Text>
                      {/* The stack as the browser will read it, not the
                            entry's name: which family actually draws a glyph
                            is the question a specimen raises and this
                            answers. */}
                      <Text color="secondary" type="code">
                        {row.fontStack}
                      </Text>
                    </VStack>
                  </TableCell>
                  <TableCell>
                    <VStack gap={0}>
                      <Text hasTabularNumbers weight="medium">
                        {row.fontSizePx}px
                      </Text>
                      {row.exactFontSizePx !== null && (
                        <Text color="secondary" hasTabularNumbers>
                          {row.exactFontSizePx.toFixed(2)} exact
                        </Text>
                      )}
                    </VStack>
                  </TableCell>
                  <TableCell>
                    <VStack gap={0}>
                      {/* Unitless is the token; the pixels are what somebody
                            is looking at. Both, because either alone prompts
                            the other question. */}
                      <Text hasTabularNumbers>{row.lineHeight}</Text>
                      <Text color="secondary" hasTabularNumbers>
                        {row.lineHeightPx}px
                      </Text>
                    </VStack>
                  </TableCell>
                  <TableCell>
                    <VStack gap={0}>
                      <Text hasTabularNumbers>{row.fontWeight}</Text>
                      <Text hasTabularNumbers>{row.letterSpacingCss}</Text>
                      <Text
                        color="secondary"
                        hasTabularNumbers
                        textWrap="nowrap"
                      >
                        {row.letterSpacingPx}px
                      </Text>
                    </VStack>
                  </TableCell>
                  <TableCell>
                    <Variables row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </>
  );
}
