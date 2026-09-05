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
import { spacingScaleSummary, type SpacingScale } from "@blueprint/ui";

/**
 * Every spacing step, and what each one looks like.
 *
 * The rows come from `resolveSpacing` in @blueprint/ui, which is the function
 * `scale-export.ts` calls to write the file — so a variable on this page is a
 * variable in the file by construction rather than by agreement.
 *
 * The bars are the half a table cannot carry. A column of numbers says 24 is
 * twice 12; a column of bars says what twice looks like, which is the question
 * somebody choosing a gap is actually asking. They are drawn from the token's
 * own pixel value, so the specimen and the row can never disagree.
 */

interface SpacingScaleProps {
  scale: SpacingScale;
}

export function SpacingTable({ scale }: SpacingScaleProps) {
  const summary = spacingScaleSummary(scale);

  return (
    <VStack gap={3}>
      <Text as="p" color="secondary" display="block">
        Base unit {summary.baseUnitPx}px, {summary.steps.length} steps, counted
        rather than multiplied.
      </Text>

      <Table density="compact" dividers="grid" hasHover verticalAlign="middle">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Step</TableHeaderCell>
            <TableHeaderCell>Variable</TableHeaderCell>
            <TableHeaderCell>Pixels</TableHeaderCell>
            <TableHeaderCell>Exported</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.tokens.map((token) => (
            <TableRow key={token.variable}>
              <TableCell>
                <Text hasTabularNumbers type="code">
                  {token.name}
                </Text>
              </TableCell>
              <TableCell>
                {/* Allowed to wrap: Astryx's table cell hides its overflow, so
                    a name too long for its column is clipped rather than
                    scrolled. */}
                <Text type="code">{token.variable}</Text>
              </TableCell>
              <TableCell>
                <Text hasTabularNumbers weight="medium">
                  {token.px}px
                </Text>
              </TableCell>
              <TableCell>
                {/* rem, so a step grows when a reader enlarges their text. */}
                <Text color="secondary" hasTabularNumbers>
                  {token.rem}rem
                </Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </VStack>
  );
}

export function SpacingSpecimen({ scale }: SpacingScaleProps) {
  const summary = spacingScaleSummary(scale);

  return (
    <VStack gap={2}>
      {summary.tokens.map((token) => (
        <div className="flex items-center gap-3" key={token.variable}>
          <Text color="secondary" hasTabularNumbers type="code">
            {token.name}
          </Text>
          {/* The bar is the token's own value, in the accent so it reads as a
              measurement rather than as a surface. A zero step draws nothing,
              which is the honest picture of what it does. */}
          <span
            aria-hidden="true"
            className="block h-4 rounded-sm bg-action-primary"
            style={{ width: `${token.px}px` }}
          />
          <Text color="secondary" hasTabularNumbers>
            {token.px}px
          </Text>
        </div>
      ))}
    </VStack>
  );
}
