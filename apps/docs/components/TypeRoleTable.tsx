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
 * The variables are the reason the table is this wide. A developer arriving
 * here wants the name to paste, and a role emits six of them; listing only the
 * size would send somebody back to the exported file to guess the other five.
 *
 * The guidance under each group comes from the content module, never from
 * here.
 */

interface TypeRoleTableProps {
  system: TypeSystem;
}

/** The six variables a role exports, one per line, in the export's order. */
function Variables({ row }: { row: TypeRoleRow }) {
  return (
    <VStack gap={0}>
      {Object.values(row.variables).map((variable) => (
        /* nowrap because a variable name broken across two lines is one
           somebody has to reassemble before pasting it. */
        <Text key={variable} textWrap="nowrap" type="code">
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

          <Table
            density="compact"
            dividers="grid"
            hasHover
            verticalAlign="middle"
          >
            <TableHeader>
              <TableRow isHeaderRow>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Element</TableHeaderCell>
                <TableHeaderCell>Font</TableHeaderCell>
                <TableHeaderCell>Size</TableHeaderCell>
                <TableHeaderCell>Line height</TableHeaderCell>
                <TableHeaderCell>Weight</TableHeaderCell>
                <TableHeaderCell>Letter spacing</TableHeaderCell>
                <TableHeaderCell>Variables</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Text type="code">{row.id}</Text>
                  </TableCell>
                  <TableCell>
                    <Text color="secondary" type="code">
                      &lt;{row.element}&gt;
                    </Text>
                  </TableCell>
                  <TableCell>
                    <VStack gap={0}>
                      <Text>{row.fontName}</Text>
                      {/* The stack as the browser will read it, not the entry's
                          name: which family actually draws a glyph is the
                          question a specimen raises and this answers. */}
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
                      {/* Unitless is the token; the pixels are what somebody is
                          looking at. Both, because either alone prompts the
                          other question. */}
                      <Text hasTabularNumbers>{row.lineHeight}</Text>
                      <Text color="secondary" hasTabularNumbers>
                        {row.lineHeightPx}px
                      </Text>
                    </VStack>
                  </TableCell>
                  <TableCell>
                    <Text hasTabularNumbers>{row.fontWeight}</Text>
                  </TableCell>
                  <TableCell>
                    <Text hasTabularNumbers>{row.letterSpacingPx}px</Text>
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
