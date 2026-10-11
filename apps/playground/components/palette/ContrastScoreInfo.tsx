"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { Info } from "lucide-react";
import { CONTRAST_SCORE_NOTES, type ContrastStandard } from "@blueprint/ui";

interface ContrastScoreInfoProps {
  standard: ContrastStandard;
}

/**
 * An Info button beside a contrast score, saying what the score is held to.
 *
 * A number on its own does not say what it has to reach. The sentence is the
 * one the grades below it are judged by, from the same constants, so the two
 * cannot disagree. A button rather than a bare icon so it takes focus and a
 * keyboard user reads it too.
 */
export function ContrastScoreInfo({ standard }: ContrastScoreInfoProps) {
  return (
    <Tooltip
      content={CONTRAST_SCORE_NOTES[standard]}
      hasHoverIndication={false}
      placement="below"
    >
      <IconButton
        icon={<Info aria-hidden className="size-3.5" />}
        label="About this contrast score"
        size="sm"
        variant="ghost"
      />
    </Tooltip>
  );
}
