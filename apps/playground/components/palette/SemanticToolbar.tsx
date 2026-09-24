"use client";

import { useState } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Lock, Plus } from "lucide-react";
import {
  addSemanticToken,
  Button,
  type ColorTrack,
  semanticCountLabel,
  type SemanticToken,
} from "@blueprint/ui";
import { SyncAnchorsDialog } from "./SyncAnchorsDialog";
import { ToneFamilyDialog } from "./ToneFamilyDialog";
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
  /** A whole new layer: a tone family added, or the tones synced. */
  onReplace: (next: SemanticToken[]) => void;
}

export function SemanticToolbar(props: SemanticToolbarProps) {
  const [isToneOpen, setIsToneOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

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
        size="medium"
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
      <Button
        className={styles.addTone}
        disabled={props.palettes.length === 0}
        leftIcon={<Plus aria-hidden />}
        scheme="neutral"
        size="small"
        variant="outlined"
        onClick={() => setIsToneOpen(true)}
      >
        Add tone
      </Button>
      {/* The label is hidden on a phone, where the lock says it; the name
          stays for a screen reader either way. */}
      <Button
        aria-label="Sync with palette anchors"
        className={styles.syncAnchors}
        disabled={props.palettes.length === 0}
        leftIcon={<Lock aria-hidden />}
        scheme="neutral"
        size="small"
        variant="text"
        onClick={() => setIsSyncOpen(true)}
      >
        <span className={styles.syncLabel}>Sync with palette anchors</span>
      </Button>

      <ToneFamilyDialog
        isOpen={isToneOpen}
        palettes={props.palettes}
        tokens={props.tokens}
        onAdd={props.onReplace}
        onClose={() => setIsToneOpen(false)}
      />
      <SyncAnchorsDialog
        isOpen={isSyncOpen}
        palettes={props.palettes}
        tokens={props.tokens}
        onClose={() => setIsSyncOpen(false)}
        onSync={props.onReplace}
      />
    </header>
  );
}
