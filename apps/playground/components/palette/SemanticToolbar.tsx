"use client";

import { TextInput } from "@astryxdesign/core/TextInput";
import {
  addSemanticToken,
  Button,
  type ColorTrack,
  semanticCountLabel,
  type SemanticToken,
} from "@blueprint/ui";
import styles from "./semantic-table.module.css";

interface SemanticToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  selected: number;
  visible: number;
  total: number;
  group: string | null;
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  onAdd: (next: SemanticToken[]) => void;
}

export function SemanticToolbar(props: SemanticToolbarProps) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.search}>
        <TextInput
          isLabelHidden
          label="Search tokens"
          placeholder="Search by name or variable"
          value={props.query}
          onChange={props.onQueryChange}
        />
      </div>
      <p
        className={`${styles.count} ${styles.toolbarCount}`}
        data-selection-count={props.selected}
      >
        {semanticCountLabel(props.selected, props.visible, props.total)}
      </p>
      <Button
        className={styles.addToken}
        scheme="neutral"
        size="small"
        variant="outlined"
        onClick={() => {
          const group = props.group ?? "custom";
          props.onAdd(
            addSemanticToken(
              props.tokens,
              props.palettes,
              `${group}.new-token`,
            ),
          );
        }}
      >
        Add token
      </Button>
    </header>
  );
}
