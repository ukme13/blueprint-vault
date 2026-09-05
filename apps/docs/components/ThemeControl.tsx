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
 * Light, dark or system, for the documentation.
 *
 * The same control the studio carries, down to the label, because it is the
 * same choice: both read `useColourModePreference`, which keeps it under one
 * key. A reader who sets dark here and opens the studio finds it dark.
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
