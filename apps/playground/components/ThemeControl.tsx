"use client";

import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_MODES, type ThemeMode } from "@blueprint/ui";
import { useThemeMode } from "../app/theme-provider";
import styles from "./theme-control.module.css";

const LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Light, dark or system, for the whole application.
 *
 * Expanded, every choice is on the rail as a button group. Collapsed, a
 * sun/moon trigger opens the same list beside the nav so the options are not
 * trapped in the icon column. `system` still reaches the preview: a semantic
 * token has no value under that name, and the canvas draws with
 * `resolveThemeMode`'s answer rather than with the choice itself.
 *
 * Glyphs are Icon md (1.25rem / 20px) on the expanded rail so they sit
 * inside the segmented control. Collapsed, they match the studio marks
 * at Icon lg. SideNavItem hardcodes sm on its own icons; this control
 * does not, so the size is set here.
 */
export function ThemeControl({
  collapsed,
  isNavCollapsed = collapsed,
}: {
  collapsed: boolean;
  isNavCollapsed?: boolean;
}) {
  const { mode, resolved, setMode } = useThemeMode();
  const TriggerIcon =
    mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;

  if (isNavCollapsed) {
    return (
      <DropdownMenu
        alignment="start"
        button={{
          className: styles.themeTrigger,
          label: "Theme",
          icon: <Icon icon={TriggerIcon} size="md" />,
          isIconOnly: true,
          size: "lg",
          variant: "ghost",
        }}
        hasChevron={false}
        items={THEME_MODES.map((each) => ({
          label: LABELS[each],
          icon: <Icon icon={ICONS[each]} size="lg" />,
          onClick: () => setMode(each),
          endContent: mode === each ? <Icon icon="check" /> : undefined,
        }))}
        menuWidth={180}
        placement="end"
      />
    );
  }

  return (
    <div className={styles.expanded} data-collapsing={collapsed}>
      <SegmentedControl
        label="Theme"
        layout="fill"
        size="md"
        value={mode}
        onChange={(next) => setMode(next as ThemeMode)}
      >
        {THEME_MODES.map((each) => (
          <SegmentedControlItem
            key={each}
            icon={<Icon icon={ICONS[each]} size="md" />}
            isLabelHidden
            label={LABELS[each]}
            value={each}
          />
        ))}
      </SegmentedControl>
    </div>
  );
}
