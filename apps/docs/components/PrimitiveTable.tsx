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
                {/* Shade and the swatch hug their content (w-px: a column
                    asks for 1px and grows only to what it holds), so Variable
                    and Value share the rest of the row and the swatch sits
                    at its far end. */}
                <TableHeaderCell className="w-px whitespace-nowrap">
                  Shade
                </TableHeaderCell>
                <TableHeaderCell>Variable</TableHeaderCell>
                <TableHeaderCell>Value</TableHeaderCell>
                <TableHeaderCell className="w-px">
                  <span className="sr-only">Swatch</span>
                </TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {track.rows.map((row) => (
                <TableRow key={row.weight}>
                  <TableCell className="w-px whitespace-nowrap">
                    <Text type="code">{row.weight}</Text>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {/* One line, whole. This was allowed to wrap because an
                        earlier nowrap clipped: `.astryx-table-cell` sets
                        `overflow-x: hidden`, and at 900px a 318px name got a
                        154px cell. The cell was that narrow because Astryx's
                        Text defaults to word-break: break-word, which lets
                        the browser size a column as if a name could break
                        after any letter. break-normal ends that, so the column
                        is at least as wide as its longest name and nowrap can
                        no longer clip one. A name broken across two lines is
                        one somebody has to reassemble before pasting. */}
                    <Text className="break-normal" type="code">
                      {row.variable}
                    </Text>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Text className="break-normal" type="code">
                      {row.value}
                    </Text>
                  </TableCell>
                  <TableCell className="w-px">
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
