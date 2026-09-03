"use client";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { THEME_MODES, type ThemeMode } from "../app/theme-mode";
import { useThemeMode } from "../app/theme-provider";

const LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/**
 * Light, dark or system, for the studio itself.
 *
 * Not the preview page's colour-mode control, which is a different question:
 * that one picks which half of the *workspace's* semantic layer the demo page
 * draws with, and it has to be answerable independently of what the person
 * looking at it prefers for their own screen. This one is that preference.
 * Labelled "Studio theme" so the two read as two things when they sit in
 * the same header.
 */
export function StudioThemeControl() {
  const { mode, setMode } = useThemeMode();

  return (
    <SegmentedControl
      label="Studio theme"
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
