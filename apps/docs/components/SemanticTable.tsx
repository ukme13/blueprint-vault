import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import {
  semanticRowGroups,
  type ColorTrack,
  type SemanticRow,
  type SemanticToken,
} from "@blueprint/ui";
import { SEMANTIC_GROUP_GUIDANCE } from "../content/colour";
import { Prose } from "./Prose";
import { Swatch } from "./Swatch";

/**
 * The semantic layer, read-only, both modes across.
 *
 * The studio's Semantics tab draws the same thing to be edited; this one is
 * for reading. What they share is `semanticRowGroups` in @blueprint/ui, which
 * decides what a group is, what it is called and what order the groups come
 * in — three small rules that would otherwise be decided twice and drift.
 *
 * Every cell says what the role resolved to as well as its colour, because
 * "surface.raised is primary 100 in light and primary 850 in dark" is the
 * sentence a developer needs and a swatch alone does not say it.
 *
 * The guidance under each group comes from the content module, never from
 * here: prose changes when the rules change, the table changes when the
 * workspace does.
 */

interface SemanticTableProps {
  tokens: SemanticToken[];
  palettes: ColorTrack[];
}

function Reference({
  row,
  mode,
}: {
  row: SemanticRow;
  mode: "light" | "dark";
}) {
  const resolved = mode === "light" ? row.light : row.dark;

  return (
    <span className="inline-flex items-center gap-2">
      <Swatch hex={resolved.hex} label={`${row.name} ${mode}`} />
      <Text type="code">
        {resolved.trackId} {resolved.weight}
      </Text>
    </span>
  );
}

export function SemanticTable({ tokens, palettes }: SemanticTableProps) {
  return (
    <>
      {semanticRowGroups(tokens, palettes).map((group) => (
        <section key={group.group} aria-labelledby={`group-${group.group}`}>
          <Text
            as="p"
            display="block"
            id={`group-${group.group}`}
            type="label"
            weight="semibold"
          >
            {group.label}
          </Text>

          {(SEMANTIC_GROUP_GUIDANCE[group.group] ?? []).map((paragraph) => (
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
                <TableHeaderCell>Variable</TableHeaderCell>
                <TableHeaderCell>Light</TableHeaderCell>
                <TableHeaderCell>Dark</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Text type="body">{row.name}</Text>
                  </TableCell>
                  <TableCell>
                    {/* A variable name broken across two lines is one somebody
                        has to reassemble before pasting it. */}
                    <Text textWrap="nowrap" type="code">
                      {row.variable}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Reference mode="light" row={row} />
                  </TableCell>
                  <TableCell>
                    <Reference mode="dark" row={row} />
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
