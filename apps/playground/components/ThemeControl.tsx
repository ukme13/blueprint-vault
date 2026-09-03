"use client";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { THEME_MODES, type ThemeMode } from "@blueprint/ui";
import { useThemeMode } from "../app/theme-provider";

const LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/**
 * Light, dark or system, for the whole application.
 *
 * One control, on every page including the preview. The preview used to carry
 * its own two-state switch on the grounds that the mode a client's system is
 * demonstrated in is a different question from the mode the person looking at
 * it prefers for their own screen. It is a different question, and answering
 * it separately still produced a studio where choosing dark left one page
 * light — so the two are one choice now, and `system` reaches the preview
 * along with the rest.
 *
 * What the preview does with it is the part that could not be shared: a
 * semantic token has a light value and a dark one and nothing filed under
 * `system`, so the canvas draws with `resolveThemeMode`'s answer rather than
 * with the choice itself.
 */
export function ThemeControl() {
  const { mode, setMode } = useThemeMode();

  return (
    <SegmentedControl
      label="Theme"
      size="sm"
      value={mode}
      onChange={(next) => setMode(next as ThemeMode)}
    >
      {THEME_MODES.map((each) => (
        <SegmentedControlItem key={each} label={LABELS[each]} value={each} />
      ))}
    </SegmentedControl>
  );
}
