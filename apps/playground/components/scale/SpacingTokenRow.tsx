"use client";

import { Check, Lock } from "lucide-react";
import {
  spacingDensityBehavior,
  spacingStepName,
  type SpacingToken,
  type SpacingUnit,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface SpacingTokenRowProps {
  token: SpacingToken;
  /** The scale's density, shown on the steps it moves. */
  density: number;
  unit: SpacingUnit;
  isSelected: boolean;
  /** Whether the scale keeps this step; a pruned one is dimmed. */
  isKept: boolean;
  onSelect: () => void;
  onToggleKept: () => void;
}

const FIXED_HINT = "Fixed on base grid: does not scale with density";

/**
 * One step of the spacing scale: its variable, its size in the list's unit,
 * whether density moves it, and a bar of its length.
 *
 * Whether density moves it: "grid" for a fine step that stays put at any
 * density, the multiplier on a layout step when density is not 1.
 *
 * A click anywhere on a kept row picks the step; the name is a button too,
 * so a keyboard and a screen reader reach it. The box at the start keeps or
 * prunes the step. A pruned row is dimmed and picks nothing: the preview
 * cannot show a step the scale does not have.
 */
export function SpacingTokenRow({
  token,
  density,
  unit,
  isSelected,
  isKept,
  onSelect,
  onToggleKept,
}: SpacingTokenRowProps) {
  /* What density does to this step: a fine step is locked to the base
     grid, a layout step moved off 1× says by how much. */
  const behaviour = spacingDensityBehavior(token, density);

  return (
    <li
      className={styles.tokenRow}
      data-pruned={isKept ? undefined : true}
      data-selected={isSelected || undefined}
      data-spacing-step={token.step}
      onClick={isKept ? onSelect : undefined}
    >
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
      <span className={styles.tokenName}>
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
      </span>
      <span data-spacing-value>
        {unit === "px" ? `${token.px}px` : `${token.rem}rem`}
      </span>
      {behaviour === "grid" ? (
        <span
          aria-label={FIXED_HINT}
          className={styles.tokenMeta}
          role="img"
          title={FIXED_HINT}
        >
          <Lock aria-hidden />
        </span>
      ) : (
        <span
          className={styles.tokenMeta}
          title={
            behaviour === "scaled"
              ? `Moved by density, ${density}×.`
              : undefined
          }
        >
          {behaviour === "scaled" ? `${density}×` : null}
        </span>
      )}
      <span
        aria-hidden="true"
        className={styles.tokenBar}
        style={{ width: `${token.px}px` }}
      />
    </li>
  );
}
