"use client";

import type { ColourMode } from "@blueprint/ui";
import { CopyValueButton } from "./CopyValueButton";

interface ElevationCopyButtonProps {
  levelName: string;
  /** The level's box-shadow value, for the mode below. */
  css: string;
  /** The mode the studio is showing: the value copied is that mode's. */
  mode: ColourMode;
}

/** Copies one level's `box-shadow` value, for the mode the studio shows. */
export function ElevationCopyButton({
  levelName,
  css,
  mode,
}: ElevationCopyButtonProps) {
  return (
    <CopyValueButton
      hint={`Copy ${mode} box-shadow`}
      label={`Copy CSS for ${levelName}`}
      value={css}
    />
  );
}
