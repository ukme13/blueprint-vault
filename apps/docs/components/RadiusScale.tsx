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
import { radiusScaleSummary, type RadiusScale } from "@blueprint/ui";

/**
 * Every radius token, drawn on a surface.
 *
 * Named by use rather than by size, so the table's first column is a job
 * — `element`, `container` — and the description beside it is the workspace's
 * own. A ramp would have needed a second decision about which step meant
 * "card", and that decision would have ended up in the components.
 *
 * A corner has to be seen on something with edges, so each specimen is a
 * surface rather than a swatch. `none` and `full` are drawn too: a square
 * corner and a pill are the two ends the named radii sit between, and leaving
 * them out of the picture would make the scale look like it ran from 4 to 28.
 */

interface RadiusScaleProps {
  scale: RadiusScale;
}

export function RadiusTable({ scale }: RadiusScaleProps) {
  const summary = radiusScaleSummary(scale);

  return (
    <VStack gap={3}>
      <Text as="p" color="secondary" display="block">
        Multiplier {summary.multiplier}. It applies to the named radii and not
        to the two that are not sizes.
      </Text>

      <Table density="compact" dividers="grid" hasHover verticalAlign="top">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Token</TableHeaderCell>
            <TableHeaderCell>Variable</TableHeaderCell>
            <TableHeaderCell>Value</TableHeaderCell>
            <TableHeaderCell>What it is for</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.tokens.map((token) => (
            <TableRow key={token.variable}>
              <TableCell>
                <Text type="code">{token.id}</Text>
              </TableCell>
              <TableCell>
                <Text type="code">{token.variable}</Text>
              </TableCell>
              <TableCell>
                <VStack gap={0}>
                  <Text hasTabularNumbers weight="medium">
                    {token.px}px
                  </Text>
                  {!token.scales && (
                    /* Said rather than left to be inferred from a value that
                       does not move when the multiplier does. */
                    <Text color="secondary">fixed</Text>
                  )}
                </VStack>
              </TableCell>
              <TableCell>
                <Text color="secondary">{token.description}</Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </VStack>
  );
}

export function RadiusSpecimen({ scale }: RadiusScaleProps) {
  const summary = radiusScaleSummary(scale);

  return (
    <div className="flex flex-wrap gap-5">
      {summary.tokens.map((token) => (
        <VStack gap={2} key={token.variable}>
          {/* A surface with a border, because a corner is only visible where
              two edges meet. The radius is the token's own value. */}
          <span
            aria-hidden="true"
            className="block size-24 border border-border-strong bg-surface-raised"
            style={{ borderRadius: `${token.px}px` }}
          />
          <Text type="code">{token.id}</Text>
          <Text color="secondary" hasTabularNumbers>
            {token.px}px
          </Text>
        </VStack>
      ))}
    </div>
  );
}
