"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { ContextMenu } from "@astryxdesign/core/ContextMenu";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  addSemanticToken,
  Button,
  deleteTokens,
  moveToGroup,
  renameSemanticToken,
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { SemanticSidebar } from "./SemanticSidebar";
import { SemanticTable } from "./SemanticTable";
import { useSemanticSelection } from "./use-semantic-selection";
import {
  useSemanticActions,
  type SemanticWriteOptions,
} from "./use-semantic-actions";
import { semanticMenuItems } from "./SemanticRowMenu";
import styles from "./semantic-table.module.css";

/**
 * Edit the semantic layer: what each name points at, in each mode.
 *
 * A spreadsheet, because that is how a designer already works: groups down the
 * left with their counts, rows that select in bulk, and one menu that does
 * everything to a selection. Both modes are on screen at once rather than
 * behind a switch — a semantic token exists to hold two values, and choosing
 * them one at a time is how a layer ends up with dark text on a dark page.
 *
 * Nothing here decides anything. Every operation is a stage 2 function from
 * `@blueprint/ui`, every write goes through the stage 3 history, and this file
 * renders the result and the refusals. That is the plan's first safety rule:
 * stage 4 wires stage 2, and does not contain logic.
 *
 * See docs/roadmap/semantic-table-editor.md.
 */

/** Below this the sidebar drops its labels and keeps its counts. */
const RAIL_BELOW = 1024;

interface SemanticEditorProps {
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  onChange: (next: SemanticToken[], options?: SemanticWriteOptions) => void;
  /** The stage 3 history, so the table's own keys can reach it. */
  onUndo?: () => void;
  onRedo?: () => void;
}

export function SemanticEditor({
  tokens,
  palettes,
  onChange,
  onUndo,
  onRedo,
}: SemanticEditorProps) {
  const [draft, setDraft] = useState<{ id: string; label: string } | null>(
    null,
  );
  /** The rows a "New group with selection" is waiting on a name for. */
  const [grouping, setGrouping] = useState<string[] | null>(null);
  const [groupName, setGroupName] = useState("");
  const selection = useSemanticSelection(tokens);
  /* SSR-safe and false on the first paint, which is why the rail is a CSS
     class rather than a different tree: the layout must not move after
     hydration on a narrow window. */
  const isRail = useMediaQuery(`(max-width: ${RAIL_BELOW - 1}px)`);

  const region = useRef<HTMLDivElement>(null);
  const groupField = useRef<HTMLInputElement>(null);

  const askForGroup = useCallback((ids: string[]) => {
    setGroupName("");
    setGrouping(ids);
  }, []);

  /* Focused here rather than with `hasAutoFocus`, and for the same reason the
     field no longer cancels on blur: the menu it opens from is still closing,
     and autofocus fires before the menu hands focus back to its trigger. An
     effect runs after that. */
  useEffect(() => {
    if (grouping) groupField.current?.focus();
  }, [grouping]);

  /* Selecting a row moves focus to the region, which is what makes Delete and
     Ctrl+Z reach it: a `<td>` holds nothing focusable, so without this the
     keys land on the body and the handler below never sees them. */
  const selectRow = useCallback(
    (id: string, modifiers: { isRange?: boolean; isToggle?: boolean }) => {
      selection.click(id, modifiers);
      region.current?.focus({ preventScroll: true });
    },
    [selection],
  );

  const { apply, actionsFor } = useSemanticActions({
    isSelected: selection.isSelected,
    onChange,
    onNewGroup: askForGroup,
    selected: selection.selected,
    tokens,
  });

  if (palettes.length === 0) {
    return (
      <section aria-label="Semantic tokens" className={styles.empty}>
        <p>
          Semantic tokens point at palette shades, so there is nothing to build
          them from yet. Create a palette first.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Semantic tokens" className={styles.editor}>
      <SemanticSidebar
        group={selection.group}
        isCollapsed={isRail}
        tokens={tokens}
        onGroupChange={selection.setGroup}
        onNewGroup={(name) =>
          apply(moveToGroup(tokens, selection.selected, name))
        }
      />

      <div
        ref={region}
        className={styles.main}
        /* On the region rather than the window, so Delete does not fire while
           somebody is typing in the search field or in a cell — and so the
           studio's other tabs never see these keys at all. */
        role="presentation"
        tabIndex={-1}
        onKeyDown={(event) => {
          const target = event.target as HTMLElement;
          const typing = !!target.closest("input, textarea, [role='combobox']");
          const meta = event.ctrlKey || event.metaKey;

          if (meta && event.key.toLowerCase() === "z") {
            event.preventDefault();
            (event.shiftKey ? onRedo : onUndo)?.();
            return;
          }
          if (typing) return;
          if (meta && event.key.toLowerCase() === "a") {
            event.preventDefault();
            selection.selectAll();
            return;
          }
          if (event.key === "Escape") selection.clear();
          if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            apply(deleteTokens(tokens, selection.selected));
          }
        }}
      >
        <header className={styles.toolbar}>
          <div className={styles.search}>
            <TextInput
              isLabelHidden
              label="Search tokens"
              placeholder="Search by name or variable"
              value={selection.query}
              onChange={selection.setQuery}
            />
          </div>
          <p
            className={styles.count}
            data-selection-count={selection.selected.length}
          >
            {selection.selected.length > 0
              ? `${selection.selected.length} selected`
              : `${selection.visible.length} of ${tokens.length}`}
          </p>
          <Button
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => onChange(addSemanticToken(tokens, palettes))}
          >
            Add token
          </Button>
        </header>

        {grouping && (
          <div className={styles.groupDraft}>
            <TextInput
              ref={groupField}
              isLabelHidden
              label="New group name"
              placeholder={`Move ${grouping.length} to group…`}
              value={groupName}
              onChange={setGroupName}
              /* No cancel on blur, and the menu is why. This field opens from
                 a menu item, and a menu returns focus to its trigger as it
                 closes — so a field that dismissed itself on blur raced the
                 menu and lost, sometimes. Escape cancels it; nothing else
                 does, which is also one fewer way to lose what you typed. */
              onKeyDown={(event) => {
                if (event.key === "Escape") setGrouping(null);
                if (event.key !== "Enter") return;
                event.preventDefault();
                const name = groupName.trim();
                /* A blank name would rename the prefix to nothing and leave
                   every moved row with an id starting at a dot. */
                if (name) apply(moveToGroup(tokens, grouping, name));
                setGrouping(null);
              }}
            />
          </div>
        )}

        <ContextMenu
          items={semanticMenuItems(actionsFor())}
          label="Token actions"
          menuWidth={220}
        >
          <div className={styles.tableWrap}>
            <SemanticTable
              actionsFor={actionsFor}
              draft={draft}
              isSelected={selection.isSelected}
              palettes={palettes}
              rows={selection.visible}
              tokens={tokens}
              onChange={onChange}
              onDraft={setDraft}
              onRename={(id, label) => {
                if (draft?.id !== id) return;
                setDraft(null);
                onChange(renameSemanticToken(tokens, id, label), {
                  editKey: `rename:${id}`,
                });
              }}
              onRowClick={selectRow}
            />
          </div>
        </ContextMenu>
      </div>
    </section>
  );
}
