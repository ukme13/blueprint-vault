"use client";

import { useState } from "react";

/**
 * The picked item of a list that can lose it: an elevation level that was
 * deleted or undone away. Falls back to the first item, so there is always
 * something to edit while the list has anything in it.
 */
export function useSelectedLevel(
  levels: readonly { id: string }[],
  initialId: string,
) {
  const [chosenId, setChosenId] = useState(initialId);
  const selectedId = levels.some((level) => level.id === chosenId)
    ? chosenId
    : (levels[0]?.id ?? initialId);
  return [selectedId, setChosenId] as const;
}
