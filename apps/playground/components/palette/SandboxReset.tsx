"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import { RotateCcw } from "lucide-react";
import { Button } from "@blueprint/ui";
import { useIsPhone } from "../use-is-phone";
import styles from "./accessibility-sandbox.module.css";

interface SandboxResetProps {
  /** True while every layer is on the roles the sandbox opened with. */
  isAtDefault: boolean;
  onReset: () => void;
}

/**
 * Puts the sandbox's colours back on the roles it opened with.
 *
 * Disabled while there is nothing to put back. A word and an icon on a wide
 * screen, where the bar has room; on a phone the icon alone, tucked in beside
 * the colour's name, so the word does not crowd the bar. Named in full either
 * way, for a screen reader and a tooltip.
 */
export function SandboxReset({ isAtDefault, onReset }: SandboxResetProps) {
  const isPhone = useIsPhone();
  const label = "Reset sandbox colours";
  const icon = <RotateCcw aria-hidden className="size-3.5" />;

  if (isPhone) {
    return (
      <IconButton
        className={styles.resetButton}
        icon={icon}
        isDisabled={isAtDefault}
        label={label}
        size="sm"
        variant="ghost"
        onClick={onReset}
      />
    );
  }
  return (
    <Button
      aria-label={label}
      className={styles.resetButton}
      disabled={isAtDefault}
      leftIcon={icon}
      scheme="neutral"
      size="small"
      variant="text"
      onClick={onReset}
    >
      Reset
    </Button>
  );
}
