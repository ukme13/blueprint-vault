import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { typeScaleSummary, type TypeSystem } from "@blueprint/ui";

/**
 * The ramp the sizes came from.
 *
 * Short on purpose: four facts and the steps they produce. The role table
 * below answers what each size is for, and repeating the ratio beside every
 * role would bury that.
 *
 * The exact column is the one worth having. Rounding turns the ratio into a
 * guide, and a guide that silently disagrees with the number next to it is
 * worse than none — so a step whose exact value already landed on a whole even
 * pixel shows nothing there, and the ones that were moved say by how much.
 */

interface TypeScaleTableProps {
  system: TypeSystem;
}

export function TypeScaleTable({ system }: TypeScaleTableProps) {
  const scale = typeScaleSummary(system);

  return (
    <>
      <Table density="compact" dividers="grid" verticalAlign="middle">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Base</TableHeaderCell>
            <TableHeaderCell>Ratio</TableHeaderCell>
            <TableHeaderCell>Steps</TableHeaderCell>
            <TableHeaderCell>Rounding</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <Text hasTabularNumbers>{scale.baseFontSizePx}px</Text>
            </TableCell>
            <TableCell>
              <Text hasTabularNumbers>{scale.ratio}</Text>
            </TableCell>
            <TableCell>
              <Text hasTabularNumbers>{scale.stepCount}</Text>
            </TableCell>
            <TableCell>
              <Text>Nearest even pixel, never below 11, ties to the ×4</Text>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table density="compact" dividers="grid" hasHover verticalAlign="middle">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Step</TableHeaderCell>
            <TableHeaderCell>Offset from base</TableHeaderCell>
            <TableHeaderCell>Size</TableHeaderCell>
            <TableHeaderCell>Exact</TableHeaderCell>
            <TableHeaderCell>Variable</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scale.steps.map((step) => {
            const rounded =
              Math.abs(step.exactFontSizePx - step.fontSizePx) > 0.005;
            return (
              <TableRow key={step.step}>
                <TableCell>
                  <Text hasTabularNumbers>{step.step}</Text>
                </TableCell>
                <TableCell>
                  <Text color="secondary" hasTabularNumbers>
                    {/* Signed, because the sign is the information: this is a
                        distance from base rather than a position in a list. */}
                    {step.isBase
                      ? "base"
                      : `${step.offset > 0 ? "+" : ""}${step.offset}`}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text hasTabularNumbers weight="medium">
                    {step.fontSizePx}px
                  </Text>
                </TableCell>
                <TableCell>
                  {rounded ? (
                    <Text color="secondary" hasTabularNumbers>
                      {step.exactFontSizePx.toFixed(2)}px
                    </Text>
                  ) : (
                    <Text color="disabled">—</Text>
                  )}
                </TableCell>
                <TableCell>
                  <Text textWrap="nowrap" type="code">
                    --font-size-{step.step}
                  </Text>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
