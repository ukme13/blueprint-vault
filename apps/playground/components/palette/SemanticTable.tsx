"use client";

import type { MouseEvent } from "react";
import { Lock } from "lucide-react";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  COLOUR_MODES,
  listConsumers,
  semanticVariableName,
  usedBy,
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { ReferenceField } from "./SemanticReferenceField";
import {
  SemanticRowMenuButton,
  type SemanticRowActions,
} from "./SemanticRowMenu";
import styles from "./semantic-table.module.css";

/**
 * The rows, and selecting them.
 *
 * Astryx's `Table` in children mode, and the selection is composed rather than
 * native. `useTableSelection` exists and is the wrong shape twice over: it is a
 * data-driven plugin, and this table has to stay in children mode while the
 * per-cell editing lives in the cells; and it selects with checkboxes, where a
 * spreadsheet selects with a click, a shift-click and a Ctrl-click. So the
 * rules are `@blueprint/ui`'s pure functions and the row carries
 * `aria-selected` itself.
 *
 * `TableRow` takes it: its published props list only `children`, and the type
 * it ships extends `BaseProps<HTMLTableRowElement>` and spreads the rest, so
 * handlers and ARIA reach the `<tr>`.
 *
 * See docs/roadmap/semantic-table-editor.md, stage 4.
 */

interface SemanticTableProps {
  rows: SemanticToken[];
  /** The whole layer, which the per-cell edits still operate over. */
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  isSelected: (id: string) => boolean;
  onRowClick: (
    id: string,
    modifiers: { isRange?: boolean; isToggle?: boolean },
  ) => void;
  onChange: (next: SemanticToken[]) => void;
  onRename: (id: string, label: string) => void;
  /** The draft label being typed, before it is committed. */
  draft: { id: string; label: string } | null;
  onDraft: (draft: { id: string; label: string } | null) => void;
  actionsFor: (id: string) => SemanticRowActions;
}

/** A click on an input, a button or a selector is not a click on the row. */
function isInteractive(event: MouseEvent<HTMLTableRowElement>): boolean {
  const target = event.target as HTMLElement | null;
  return !!target?.closest(
    "input, button, select, textarea, a, [role='combobox'], [role='listbox']",
  );
}

export function SemanticTable({
  rows,
  tokens,
  palettes,
  isSelected,
  onRowClick,
  onChange,
  onRename,
  draft,
  onDraft,
  actionsFor,
}: SemanticTableProps) {
  return (
    <Table density="compact" dividers="grid" hasHover verticalAlign="middle">
      <TableHeader>
        <TableRow isHeaderRow>
          <TableHeaderCell>Token</TableHeaderCell>
          <TableHeaderCell>Variable</TableHeaderCell>
          <TableHeaderCell>Light</TableHeaderCell>
          <TableHeaderCell>Dark</TableHeaderCell>
          <TableHeaderCell className={styles.actionsHeader}>
            <span className={styles.srOnly}>Actions</span>
          </TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((token) => {
          const consumers = usedBy(token.id);
          const selected = isSelected(token.id);

          return (
            <TableRow
              key={token.id}
              aria-selected={selected}
              className={styles.row}
              data-selected={selected ? "true" : undefined}
              onClick={(event) => {
                if (isInteractive(event)) return;
                onRowClick(token.id, {
                  isRange: event.shiftKey,
                  isToggle: event.ctrlKey || event.metaKey,
                });
              }}
              onContextMenu={() => {
                /* Right-clicking a row that is not in the selection makes it
                   the selection, which is what every file manager does — the
                   alternative is a menu whose Delete applies to rows somebody
                   cannot see the highlight on. */
                if (!selected) onRowClick(token.id, {});
              }}
            >
              <TableCell>
                <div className={styles.nameCell} data-token={token.id}>
                  {consumers.length > 0 && (
                    <Tooltip
                      content={`Read by ${listConsumers(consumers)}. It can be repointed, not deleted or renamed.`}
                    >
                      <span
                        aria-label={`${token.id} is read by ${listConsumers(consumers)}`}
                        className={styles.lock}
                        data-locked={token.id}
                        role="img"
                      >
                        {/* A drawn icon, not a glyph. The first pass used ⚿,
                            which is not in the studio's typeface and rendered
                            as a tofu box in every row — visible only in a
                            screenshot, because it is a character and every
                            test that asked for it found it. */}
                        <Lock aria-hidden="true" size={12} />
                      </span>
                    </Tooltip>
                  )}
                  <TextInput
                    isLabelHidden
                    label={`${token.id} name`}
                    value={draft?.id === token.id ? draft.label : token.name}
                    /* Typing changes the label only. A rename re-slugs the id,
                       which is this row's React key, so doing it per keystroke
                       remounts the field and drops focus after one character —
                       the mistake the typography groups already made. */
                    onChange={(label) => onDraft({ id: token.id, label })}
                    onBlur={() => onRename(token.id, draft?.label ?? "")}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      event.currentTarget.blur();
                    }}
                  />
                </div>
              </TableCell>
              <TableCell>
                <code className={styles.variable}>
                  {semanticVariableName(token.id)}
                </code>
              </TableCell>
              {COLOUR_MODES.map((mode) => (
                <TableCell key={mode}>
                  <ReferenceField
                    mode={mode}
                    palettes={palettes}
                    token={token}
                    tokens={tokens}
                    onChange={onChange}
                  />
                </TableCell>
              ))}
              <TableCell>
                <SemanticRowMenuButton
                  actions={actionsFor(token.id)}
                  label={`Actions for ${token.name}`}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
