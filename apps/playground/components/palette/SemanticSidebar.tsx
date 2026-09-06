"use client";

import { useState } from "react";
import { List, ListItem } from "@astryxdesign/core/List";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { Button, semanticGroupCounts, type SemanticToken } from "@blueprint/ui";
import styles from "./semantic-table.module.css";

/**
 * The groups down the left, with how many rows are in each.
 *
 * `List` rather than `SideNav`: the layout guidance is explicit that a sidebar
 * of filters is not navigation, and these entries change what the table beside
 * them shows rather than where somebody is. `ListItem` carries `isSelected`,
 * so the current group is announced rather than only shaded.
 *
 * The counts come from `semanticGroupCounts`, which is built on the same
 * grouping rule the export and the documentation page use — a sidebar with its
 * own idea of which group a token is in would put a row somewhere the file
 * does not.
 */

interface SemanticSidebarProps {
  tokens: SemanticToken[];
  group: string | null;
  onGroupChange: (group: string | null) => void;
  /** Move the current selection into a new group. Absent while nothing is selected. */
  onNewGroup?: (name: string) => void;
  /** Below 1024 the labels go and the counts stay: a rail, not a panel. */
  isCollapsed: boolean;
}

export function SemanticSidebar({
  tokens,
  group,
  onGroupChange,
  onNewGroup,
  isCollapsed,
}: SemanticSidebarProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const groups = semanticGroupCounts(tokens);

  const entries = [
    { group: null as string | null, label: "All", count: tokens.length },
    ...groups,
  ];

  return (
    <nav
      aria-label="Token groups"
      className={styles.sidebar}
      data-collapsed={isCollapsed ? "true" : undefined}
    >
      <List density="compact">
        {entries.map((entry) => (
          <ListItem
            key={entry.group ?? "all"}
            /* Collapsed, the count *is* the label. A rail of numbers is only
               readable with the name somewhere, and this rail has no icons to
               fall back on — a group is a word, not a glyph — so the name goes
               into a tooltip and into the accessible name. */
            label={
              isCollapsed ? (
                <Tooltip content={`${entry.label} · ${entry.count}`}>
                  <span aria-label={`${entry.label}, ${entry.count}`}>
                    {entry.count}
                  </span>
                </Tooltip>
              ) : (
                entry.label
              )
            }
            endContent={
              isCollapsed ? undefined : (
                <span className={styles.count}>{entry.count}</span>
              )
            }
            isSelected={entry.group === group}
            onClick={() => onGroupChange(entry.group)}
          />
        ))}
      </List>

      {!isCollapsed && onNewGroup && (
        <div className={styles.newGroup}>
          {draft === null ? (
            <Button
              scheme="neutral"
              size="xs"
              variant="text"
              onClick={() => setDraft("")}
            >
              New group
            </Button>
          ) : (
            <TextInput
              hasAutoFocus
              isLabelHidden
              label="New group name"
              placeholder="Group name"
              value={draft}
              onChange={setDraft}
              onBlur={() => setDraft(null)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setDraft(null);
                if (event.key !== "Enter") return;
                event.preventDefault();
                const name = draft.trim();
                /* A blank name would rename the prefix to nothing and give
                   every moved row an id starting with a dot. */
                if (name) onNewGroup(name);
                setDraft(null);
              }}
            />
          )}
        </div>
      )}
    </nav>
  );
}
