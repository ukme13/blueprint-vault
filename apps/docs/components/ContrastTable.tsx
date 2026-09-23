import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  assessTextChecks,
  describeReference,
  previewShadesFor,
  resolvedRoleReference,
  type ColorTrack,
  type ColourMode,
  type SemanticToken,
} from "@blueprint/ui";
import { Swatch } from "./Swatch";

/**
 * What the layer measures, for this workspace, in one mode.
 *
 * The numbers are the accessibility report's own — `assessTextChecks` is what
 * the studio's preview and the exported report both run, so a reader here and
 * a reader of the report cannot be told two different things about the same
 * pair.
 *
 * Each row names the two roles and the primitives they resolved to. A ratio on
 * its own says a pair is wrong and not which pair, which is the difference
 * between a report and a to-do; `resolvedRoleReference` is what turns an id
 * into "error 900 on error 50", and `describeReference` adds the alpha when
 * the side carried one — a row measured on a composite has to say so, or the
 * reader cannot get back to the ratio from the two shades named.
 */

interface ContrastTableProps {
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  mode: ColourMode;
}

export function ContrastTable({ tokens, palettes, mode }: ContrastTableProps) {
  const shades = previewShadesFor(tokens, palettes, mode);
  if (!shades) return null;

  return (
    <Table density="compact" dividers="rows" hasHover verticalAlign="middle">
      <TableHeader>
        <TableRow isHeaderRow>
          <TableHeaderCell>Pair</TableHeaderCell>
          <TableHeaderCell>Roles</TableHeaderCell>
          <TableHeaderCell>Resolved</TableHeaderCell>
          <TableHeaderCell>Ratio</TableHeaderCell>
          <TableHeaderCell>Verdict</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assessTextChecks(shades, undefined).map((check) => {
          const foreground = resolvedRoleReference(
            tokens,
            check.foregroundToken,
            mode,
            palettes,
          );
          const background = resolvedRoleReference(
            tokens,
            check.backgroundToken,
            mode,
            palettes,
          );

          return (
            <TableRow key={check.label}>
              <TableCell>
                <Text type="body">{check.label}</Text>
              </TableCell>
              {/* Foreground over background, one per line and never
                  wrapped. As one run of text these columns squeezed in the
                  768px column and broke token names mid-word, "surface.bas"
                  over "e"; stacked, each line is short enough to fit whole,
                  and the table scrolls sideways before it breaks one. */}
              <TableCell className="whitespace-nowrap">
                <VStack gap={0.5}>
                  <Text type="code">
                    {/* A readable foreground is black or white chosen for the
                        fill rather than a role, so saying its id would name a
                        token that is not what was measured. */}
                    {check.isForegroundReadable
                      ? "readable"
                      : check.foregroundToken}
                  </Text>
                  <Text color="secondary" type="code">
                    {`on ${check.backgroundToken}`}
                  </Text>
                </VStack>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {/* Solid, and deliberately: `assessTextChecks` composites a
                    transparent side over its ground before measuring, so
                    these two hexes are the colours the ratio was taken from.
                    A checker here would draw the reference rather than the
                    result, and the result is what was measured. The text
                    beside each names the alpha that produced it. Each swatch
                    now sits on the line it describes. */}
                <VStack gap={1}>
                  <HStack gap={1.5} vAlign="center">
                    <Swatch
                      hex={check.foreground}
                      label={`${check.label} text`}
                    />
                    <Text type="code">
                      {foreground && !check.isForegroundReadable
                        ? describeReference(foreground)
                        : check.foreground}
                    </Text>
                  </HStack>
                  <HStack gap={1.5} vAlign="center">
                    <Swatch
                      hex={check.background}
                      label={`${check.label} background`}
                    />
                    <Text color="secondary" type="code">
                      {`on ${
                        background
                          ? describeReference(background)
                          : check.background
                      }`}
                    </Text>
                  </HStack>
                </VStack>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Text type="code">{check.result.ratio.toFixed(2)}:1</Text>
              </TableCell>
              <TableCell>
                <Text
                  color={check.result.status === "pass" ? "primary" : "accent"}
                  type="body"
                >
                  {check.result.summary}
                </Text>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
