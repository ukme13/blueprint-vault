"use client";

import { Check, Lock } from "lucide-react";
import {
  spacingStepName,
  type SpacingToken,
  type SpacingUnit,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface SpacingTokenRowProps {
  token: SpacingToken;
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
 * A fine step, which density never moves, has a
 * lock after its name; a layout step says nothing, since its size already
 * shows what density did.
 *
 * A click anywhere on a kept row picks the step; the name is a button too,
 * so a keyboard and a screen reader reach it. The box at the start keeps or
 * prunes the step. A pruned row is dimmed and picks nothing: the preview
 * cannot show a step the scale does not have.
 */
export function SpacingTokenRow({
  token,
  unit,
  isSelected,
  isKept,
  onSelect,
  onToggleKept,
}: SpacingTokenRowProps) {
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
        {token.followsDensity ? null : (
          <span
            aria-label={FIXED_HINT}
            className={styles.tokenLock}
            role="img"
            title={FIXED_HINT}
          >
            <Lock aria-hidden />
          </span>
        )}
      </span>
      <span className={styles.tokenValue} data-spacing-value>
        {unit === "px" ? `${token.px}px` : `${token.rem}rem`}
      </span>
    </li>
  );
}
