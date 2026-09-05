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
  assessTextChecks,
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
 * into "error 900 on error 50".
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
              <TableCell>
                <Text type="code">
                  {/* A readable foreground is black or white chosen for the
                      fill rather than a role, so saying its id would name a
                      token that is not what was measured. */}
                  {check.isForegroundReadable
                    ? `readable on ${check.backgroundToken}`
                    : `${check.foregroundToken} on ${check.backgroundToken}`}
                </Text>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <Swatch
                    hex={check.foreground}
                    label={`${check.label} text`}
                  />
                  <Swatch
                    hex={check.background}
                    label={`${check.label} background`}
                  />
                  <Text type="code">
                    {foreground && !check.isForegroundReadable
                      ? `${foreground.trackId} ${foreground.weight}`
                      : check.foreground}
                    {" on "}
                    {background
                      ? `${background.trackId} ${background.weight}`
                      : check.background}
                  </Text>
                </span>
              </TableCell>
              <TableCell>
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
