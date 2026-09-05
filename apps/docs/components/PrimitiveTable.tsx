import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { primitiveTrackRows, type ColorTrack } from "@blueprint/ui";
import { Swatch } from "./Swatch";

/**
 * Every shade of every track, as a table per track.
 *
 * A table rather than a grid of cards: this is dense uniform data, four
 * columns of it, and a reader scanning for a weight wants rows. The rows come
 * from `primitiveTrackRows` in @blueprint/ui, which builds the variable name
 * with the same function the CSS export uses — so the name on this page is
 * the name in the file somebody installs, rather than a second spelling of the
 * same rule.
 *
 * Nothing here holds a colour. Every value on the page arrives in props from
 * the workspace, which is what makes this a template rather than a document.
 */

interface PrimitiveTableProps {
  palettes: ColorTrack[];
  colourFormat: "hex" | "oklch" | "rgb";
}

export function PrimitiveTable({
  palettes,
  colourFormat,
}: PrimitiveTableProps) {
  const tracks = primitiveTrackRows(palettes, colourFormat);

  return (
    <>
      {tracks.map((track) => (
        <section key={track.id} aria-labelledby={`track-${track.id}`}>
          <Text
            as="p"
            display="block"
            id={`track-${track.id}`}
            type="label"
            weight="semibold"
          >
            {track.name}
          </Text>
          <Table density="compact" dividers="rows" hasHover>
            <TableHeader>
              <TableRow isHeaderRow>
                <TableHeaderCell>Shade</TableHeaderCell>
                <TableHeaderCell>Variable</TableHeaderCell>
                <TableHeaderCell>Value</TableHeaderCell>
                <TableHeaderCell>
                  <span className="sr-only">Swatch</span>
                </TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {track.rows.map((row) => (
                <TableRow key={row.weight}>
                  <TableCell>
                    <Text type="code">{row.weight}</Text>
                  </TableCell>
                  <TableCell>
                    {/* A variable name broken across two lines is one somebody
                        has to reassemble before pasting it. */}
                    <Text textWrap="nowrap" type="code">
                      {row.variable}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text type="code">{row.value}</Text>
                  </TableCell>
                  <TableCell>
                    <Swatch
                      hex={row.hex}
                      label={`${track.name} ${row.weight}`}
                    />
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
