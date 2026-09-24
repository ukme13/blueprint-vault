"use client";

import { useState } from "react";
import { Button as AstryxButton } from "@astryxdesign/core/Button";
import { ButtonGroup } from "@astryxdesign/core/ButtonGroup";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ChevronDown, Plus, RefreshCw } from "lucide-react";
import {
  addSemanticToken,
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

  const addToken = () => {
    const group = props.group ?? "custom";
    props.onAdd(
      addSemanticToken(props.tokens, props.palettes, `${group}.new-token`),
    );
  };

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
      {/* One control for adding: the button adds a token, which is what
          Add did before tones existed; the chevron offers the choice. md,
          32px, the height of the search field beside it. A div rather than a
          span: Astryx moves a menu out of any span above it. */}
      <div className={styles.addGroup}>
        <ButtonGroup label="Add" size="md">
          <AstryxButton
            icon={<Plus aria-hidden className="size-4" />}
            isDisabled={props.palettes.length === 0}
            label="Add"
            size="md"
            onClick={addToken}
          />
          <DropdownMenu
            alignment="end"
            button={{
              label: "More ways to add",
              icon: <ChevronDown aria-hidden className="size-4" />,
              isIconOnly: true,
              isDisabled: props.palettes.length === 0,
              size: "md",
            }}
            hasChevron={false}
            items={[
              { label: "Add token", onClick: addToken },
              { label: "Add tone", onClick: () => setIsToneOpen(true) },
            ]}
            menuWidth={160}
          />
        </ButtonGroup>
      </div>
      <AstryxButton
        className={styles.syncAnchors}
        icon={<RefreshCw aria-hidden className="size-4" />}
        isDisabled={props.palettes.length === 0}
        label="Sync"
        size="md"
        variant="ghost"
        onClick={() => setIsSyncOpen(true)}
      />

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
