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
  elevationRows,
  resolvedRoleReference,
  type ColorTrack,
  type ColourMode,
  type ElevationScale as ElevationScaleData,
  type SemanticToken,
} from "@blueprint/ui";
import { Swatch } from "./Swatch";

/**
 * Every level, on a light ground and a dark one, in whichever mode the reader
 * is in.
 *
 * Four pictures per level rather than two, and that is the point rather than
 * thoroughness. The colour of a shadow is one reference and does not flip with
 * the mode; its strength does. Showing a level only in the mode you happen to
 * be reading in would let somebody conclude the opposite, because a shadow that
 * looks right on a light page and a shadow that looks right on a dark one are
 * the same black at two alphas — and that is precisely the thing the plan
 * assumed backwards.
 *
 * The grounds are `surface.base` resolved in each mode and the cards are
 * `surface.raised`, passed in as data the way `Swatch` takes a hex. They cannot
 * be utility classes: a semantic utility resolves to whichever mode the page is
 * in, so `bg-surface-base` would draw the same ground twice. The playground's
 * editor reaches for `--color-neutral-50` and `--color-neutral-900` here, which
 * is a primitive and not something a documentation page may name.
 */

interface ElevationScaleProps {
  scale: ElevationScaleData;
  palettes: ColorTrack[];
  tokens: SemanticToken[];
}

/** A surface role's colour in one mode, as a value rather than a class. */
function roleHex(
  tokens: SemanticToken[],
  id: string,
  mode: ColourMode,
  palettes: ColorTrack[],
  fallback: string,
): string {
  return resolvedRoleReference(tokens, id, mode, palettes)?.hex ?? fallback;
}

export function ElevationTable({
  scale,
  palettes,
}: Omit<ElevationScaleProps, "tokens">) {
  const { rows, colour } = elevationRows(scale, palettes);

  return (
    <VStack gap={3}>
      <Text as="p" color="secondary" display="block">
        Every shadow is drawn from{" "}
        <Text type="code">
          {colour.trackId} {colour.weight}
        </Text>{" "}
        <Swatch hex={colour.hex} label="Shadow colour" /> — one reference, the
        same in both modes.
      </Text>

      <Table density="compact" dividers="grid" hasHover verticalAlign="top">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Level</TableHeaderCell>
            <TableHeaderCell>Variable</TableHeaderCell>
            <TableHeaderCell>Layers</TableHeaderCell>
            <TableHeaderCell>Light strength</TableHeaderCell>
            <TableHeaderCell>Dark strength</TableHeaderCell>
            <TableHeaderCell>What it is for</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.variable}>
              <TableCell>
                <Text type="code">{row.id}</Text>
              </TableCell>
              <TableCell>
                <Text type="code">{row.variable}</Text>
              </TableCell>
              <TableCell>
                <Text hasTabularNumbers>{row.layerCount}</Text>
              </TableCell>
              <TableCell>
                <Text hasTabularNumbers weight="medium">
                  {row.opacity.light}
                </Text>
              </TableCell>
              <TableCell>
                {/* Higher, always: a dark surface swallows a shadow, so the
                    same black needs more of it. */}
                <Text hasTabularNumbers weight="medium">
                  {row.opacity.dark}
                </Text>
              </TableCell>
              <TableCell>
                <Text color="secondary">{row.description}</Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </VStack>
  );
}

export function ElevationSpecimen({
  scale,
  palettes,
  tokens,
}: ElevationScaleProps) {
  const { rows } = elevationRows(scale, palettes);
  const grounds: Array<{ mode: ColourMode; ground: string; card: string }> = (
    ["light", "dark"] as ColourMode[]
  ).map((mode) => ({
    mode,
    ground: roleHex(tokens, "surface.base", mode, palettes, "#ffffff"),
    card: roleHex(tokens, "surface.raised", mode, palettes, "#ffffff"),
  }));

  return (
    <VStack gap={5}>
      {rows.map((row) => (
        <VStack gap={2} key={row.variable}>
          <Text type="code">{row.variable}</Text>
          <div className="flex flex-wrap gap-4">
            {grounds.map(({ mode, ground, card }) => (
              <VStack gap={1} key={mode}>
                <div
                  className="flex h-24 w-48 items-center justify-center rounded"
                  style={{ background: ground }}
                >
                  <span
                    aria-label={`${row.name} on a ${mode} ground`}
                    className="block h-12 w-32 rounded"
                    role="img"
                    style={{
                      background: card,
                      boxShadow:
                        mode === "light" ? row.light.css : row.dark.css,
                    }}
                  />
                </div>
                <Text color="secondary" type="code">
                  {mode} ·{" "}
                  {mode === "light" ? row.opacity.light : row.opacity.dark}
                </Text>
              </VStack>
            ))}
          </div>
        </VStack>
      ))}
    </VStack>
  );
}
