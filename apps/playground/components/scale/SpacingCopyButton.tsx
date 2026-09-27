"use client";

import type { SpacingToken } from "@blueprint/ui";
import { CopyValueButton } from "./CopyValueButton";

/**
 * Copies a spacing step as the variable a stylesheet uses, `var(--spacing-4)`,
 * rather than its pixels: a component that takes the variable follows the
 * scale when it changes; one that took 16px does not.
 */
export function SpacingCopyButton({ token }: { token: SpacingToken }) {
  const value = `var(${token.variable})`;
  return (
    <CopyValueButton
      hint={`Copy ${value}`}
      label={`Copy ${token.variable}`}
      value={value}
    />
  );
}
