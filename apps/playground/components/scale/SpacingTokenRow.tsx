"use client";

import { Check } from "lucide-react";
import {
  spacingDensityBehavior,
  spacingStepName,
  type LayoutToken,
  type SpacingToken,
} from "@blueprint/ui";
import { SpacingCopyButton } from "./SpacingCopyButton";
import styles from "./scale-workspace.module.css";

interface SpacingTokenRowProps {
  token: SpacingToken;
  /** The scale's density, shown on the steps it moves. */
  density: number;
  isSelected: boolean;
  /** Whether the scale keeps this step; a pruned one is dimmed. */
  isKept: boolean;
  /** The layout uses that point at this step on some frame. */
  uses: readonly LayoutToken[];
  onSelect: () => void;
  onToggleKept: () => void;
  /** Open the Uses tab at one of them. */
  onOpenUse: (id: string) => void;
}

/**
 * One step of the spacing scale: its variable, its size, and what it is.
 *
 * What it is has two halves. Whether density moves it — "grid" for a fine
 * step that stays put at any density, the multiplier on a layout step when
 * density is not 1 — and which layout uses reach for it, each a button that
 * opens that use in the Uses tab, so a step's size and what it sizes are
 * one click apart.
 *
 * A click anywhere on a kept row picks the step; the name is a button too,
 * so a keyboard and a screen reader reach it. The box at the start keeps or
 * prunes the step. A pruned row is dimmed and picks nothing: the preview
 * cannot show a step the scale does not have.
 */
export function SpacingTokenRow({
  token,
  density,
  isSelected,
  isKept,
  uses,
  onSelect,
  onToggleKept,
  onOpenUse,
}: SpacingTokenRowProps) {
  /* What density does to this step, said beside it. */
  const behaviour = {
    grid: {
      text: "grid",
      title: "On the fine grid: density does not move it.",
    },
    scaled: { text: `${density}×`, title: `Moved by density, ${density}×.` },
    unchanged: null,
  }[spacingDensityBehavior(token, density)];

  return (
    <li
      className={styles.tokenRow}
      data-pruned={isKept ? undefined : true}
      data-selected={isSelected || undefined}
      data-spacing-step={token.step}
      onClick={isKept ? onSelect : undefined}
    >
      <span className={styles.tokenName}>
        <button
          aria-label={`Keep step ${spacingStepName(token.step)}`}
          aria-pressed={isKept}
          className={styles.tokenKeep}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleKept();
          }}
        >
          {isKept ? <Check aria-hidden /> : null}
        </button>
        <button
          aria-pressed={isSelected}
          className={styles.tokenPick}
          disabled={!isKept}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          <code>{token.variable}</code>
        </button>
        {isKept ? <SpacingCopyButton token={token} /> : null}
      </span>
      <span>{token.px}px</span>
      <span className={styles.tokenMeta}>{token.rem}rem</span>
      <span className={styles.tokenMeta} title={behaviour?.title}>
        {behaviour?.text}
      </span>
      <span
        aria-hidden="true"
        className={styles.tokenBar}
        style={{ width: `${token.px}px` }}
      />
      <span className={styles.tokenUses}>
        {uses.map((use) => (
          <button
            key={use.id}
            aria-label={`${use.name}, in Uses`}
            className={styles.tokenUse}
            data-layout-use={use.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenUse(use.id);
            }}
          >
            {use.name}
          </button>
        ))}
      </span>
    </li>
  );
}
