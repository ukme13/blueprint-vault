"use client";

import { Selector } from "@astryxdesign/core/Selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import {
  layoutVariableName,
  resolveRadius,
  resolveSpacing,
  sortPreviewDevicesLargestFirst,
  type LayoutToken,
  type PreviewDevice,
  type RadiusScale,
  type SpacingScale,
} from "@blueprint/ui";
import styles from "./workspace-settings.module.css";

export function LayoutTokenTable({
  devices,
  radius,
  spacing,
  tokens,
  onChange,
}: {
  devices: readonly PreviewDevice[];
  radius: RadiusScale;
  spacing: SpacingScale;
  tokens: readonly LayoutToken[];
  onChange: (tokenId: string, deviceId: string, primitiveId: string) => void;
}) {
  const columns = sortPreviewDevicesLargestFirst(devices);
  const spacingOptions = resolveSpacing(spacing).map((token) => ({
    label: token.name,
    value: token.name,
  }));
  const radiusOptions = resolveRadius(radius).map((token) => ({
    label: token.name,
    value: token.id,
  }));

  return (
    <section className={styles.group} aria-label="Layout tokens">
      <h2>Layout tokens</h2>
      <p className={styles.hint}>
        One name per use. Each column is a preview frame, pointing at a spacing
        step or a radius token.
      </p>
      <Table aria-label="Layout tokens">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Use</TableHeaderCell>
            {columns.map((device) => (
              <TableHeaderCell key={device.id}>
                {device.name}
                <span className={styles.columnWidth}>{device.widthPx}px</span>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((token) => (
            <TableRow key={token.id}>
              <TableCell>
                <span className={styles.tokenName}>{token.name}</span>
                <code className={styles.tokenVar}>
                  {layoutVariableName(token.id)}
                </code>
              </TableCell>
              {columns.map((device) => (
                <TableCell key={device.id}>
                  <Selector
                    isLabelHidden
                    label={`${token.name} on ${device.name}`}
                    options={
                      token.kind === "radius" ? radiusOptions : spacingOptions
                    }
                    value={token.byDevice[device.id] ?? ""}
                    onChange={(primitiveId) =>
                      onChange(token.id, device.id, primitiveId)
                    }
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
