"use client";

import { useMemo } from "react";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { TypeRoleRowGroup } from "@blueprint/ui";
import { InspectSection } from "./InspectPrimitives";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

/** What the element says, as one line or a few. */
export function CopySection({
  text,
  field,
  onTextChange,
}: {
  text: string;
  field: "line" | "area";
  onTextChange: (text: string) => void;
}) {
  return (
    <div className={styles.copy}>
      {field === "area" ? (
        <TextArea
          label="Copy"
          value={text}
          width="100%"
          onChange={onTextChange}
        />
      ) : (
        <TextInput
          label="Copy"
          value={text}
          width="100%"
          onChange={onTextChange}
        />
      )}
    </div>
  );
}

/**
 * The type role an element is set in, as the design's chip: `Aa  H3 · 40/48`,
 * the name and what it comes to on the frame being previewed.
 */
export function TypographySection({
  roleId,
  roleGroups,
  onRoleChange,
}: {
  roleId: string | undefined;
  roleGroups: readonly TypeRoleRowGroup[];
  onRoleChange: (roleId: string) => void;
}) {
  const options = useMemo(
    () =>
      roleGroups.map((group) => ({
        type: "section" as const,
        title: group.label,
        options: group.rows.map((row) => ({
          value: row.id,
          label: row.name,
          description: `${row.fontSizePx}/${row.lineHeightPx}`,
        })),
      })),
    [roleGroups],
  );
  const row = roleGroups
    .flatMap((group) => group.rows)
    .find((each) => each.id === roleId);

  return (
    <InspectSection title="Typography">
      <div className={styles.item}>
        <TokenSelect
          display={
            row
              ? {
                  icon: <strong aria-hidden>Aa</strong>,
                  text: (
                    <>
                      {row.name}
                      <small>
                        {row.fontSizePx}/{row.lineHeightPx}
                      </small>
                    </>
                  ),
                }
              : null
          }
          hasSearch
          label="Type role"
          options={options}
          placeholder="Style"
          value={roleId}
          onChange={(next) => next && onRoleChange(next)}
        />
      </div>
    </InspectSection>
  );
}
