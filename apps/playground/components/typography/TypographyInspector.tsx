"use client";

import type { ComponentProps } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import {
  MAX_BASE_FONT_SIZE_PX,
  MAX_STEP_COUNT,
  MIN_BASE_FONT_SIZE_PX,
  MIN_STEP_COUNT,
  type TypeScaleWarning,
  type TypeSystem,
} from "@blueprint/ui";
import { FontsSettings } from "./FontsSettings";
import { PreviewDeviceSettings } from "./PreviewDeviceSettings";
import { RoleGroupsPanel } from "./RoleGroupsPanel";
import type { TypographySystemActions } from "./use-typography-system";
import styles from "./typography-workspace.module.css";

export type InspectorTab = "settings" | "groups" | "warnings";

/** The tabs a `?tab=` may name; the first is the one the inspector opens on. */
export const INSPECTOR_TABS = [
  "settings",
  "groups",
  "warnings",
] as const satisfies readonly InspectorTab[];

interface TypographyInspectorProps {
  system: TypeSystem;
  actions: TypographySystemActions;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  /** The warnings worth acting on; a pass is not one. */
  warnings: TypeScaleWarning[];
  /** The devices' ratio fields. */
  devices: ComponentProps<typeof PreviewDeviceSettings>;
  /** The Fonts panel's file state, which the studio's loader shares. */
  fonts: Pick<
    ComponentProps<typeof FontsSettings>,
    "fileStatus" | "onFilesChange"
  >;
  /** The Groups tab, less what it shares with the tabs around it. */
  groups: Omit<ComponentProps<typeof RoleGroupsPanel>, "system" | "actions">;
}

/**
 * The type scale's settings, groups and warnings, as three tabs.
 *
 * One element, rendered beside the specimens on a wide screen and in a sheet
 * on a phone, so the two can never offer different controls. Three tabs
 * because one column holding the scale, every font, every group and the
 * warnings was a scroll long enough that changing the ratio meant losing
 * sight of what it changed.
 */
export function TypographyInspector({
  system,
  actions,
  tab,
  onTabChange,
  warnings,
  devices,
  fonts,
  groups,
}: TypographyInspectorProps) {
  return (
    <>
      {/* TabList takes no className, so the tabs are reached through a
          wrapper.

          Astryx gives a tab a 10px radius, which reads as a pill floating
          over the panel rather than a strip across the top of it, and pins
          its height at 32px with a border box — so padding on its own is
          absorbed rather than added. The height goes up by the 8px the
          padding asks for.

          The hover and selected background is not the button: it is a span
          behind the label, sized to the old 32px and rounded to match, so
          squaring the button alone left a rounded pill floating inside a
          square tab. */}
      <div className="[&_.astryx-tab]:h-10 [&_.astryx-tab]:rounded-none [&_.astryx-tab]:py-1 [&_.astryx-tab>span:first-child]:h-full [&_.astryx-tab>span:first-child]:rounded-none">
        <TabList
          hasDivider
          layout="fill"
          /* The tabs pattern rather than navigation: these switch panels in
             place, and `panelId` is how a screen reader gets from a tab to
             the panel it opened. */
          role="tablist"
          value={tab}
          onChange={(value) => onTabChange(value as InspectorTab)}
        >
          <Tab label="Settings" panelId="inspector-settings" value="settings" />
          <Tab label="Groups" panelId="inspector-groups" value="groups" />
          <Tab
            label="Warnings"
            panelId="inspector-warnings"
            value="warnings"
            /* Counts only, which is what a badge is for. Absent at zero: a
               badge reading 0 is a count of nothing taking up the room of a
               count of something. */
            endContent={
              warnings.length > 0 ? (
                <Badge label={String(warnings.length)} variant="warning" />
              ) : undefined
            }
          />
        </TabList>
      </div>

      <div hidden={tab !== "settings"} id="inspector-settings" role="tabpanel">
        <div className={styles.settingGroup}>
          <h2>Scale</h2>
          <NumberInput
            description="Even numbers only."
            label="Base font size"
            min={MIN_BASE_FONT_SIZE_PX}
            max={MAX_BASE_FONT_SIZE_PX}
            step={2}
            units="px"
            value={system.baseFontSizePx}
            onChange={(value) =>
              actions.updateSystem({ baseFontSizePx: value })
            }
          />
          <NumberInput
            isIntegerOnly
            label="Number of steps"
            min={MIN_STEP_COUNT}
            max={MAX_STEP_COUNT}
            value={system.stepCount}
            onChange={(value) => actions.updateSystem({ stepCount: value })}
          />
        </div>

        <PreviewDeviceSettings {...devices} />

        <FontsSettings
          {...fonts}
          addFont={actions.addFont}
          fonts={system.fonts}
          removeFont={actions.removeFont}
          removeFontSlot={actions.removeFontSlot}
          renameFont={actions.renameFont}
          setGoogleFont={actions.setGoogleFont}
          setLocalFont={actions.setLocalFont}
        />
      </div>

      <div hidden={tab !== "groups"} id="inspector-groups" role="tabpanel">
        <RoleGroupsPanel {...groups} actions={actions} system={system} />
      </div>

      <div hidden={tab !== "warnings"} id="inspector-warnings" role="tabpanel">
        <div className={styles.settingGroup}>
          <h2>Warnings</h2>
          <ul className={styles.warningList}>
            {warnings.map((warning) => (
              <li key={warning.id} data-status={warning.status}>
                {warning.summary}
              </li>
            ))}
            {warnings.length === 0 && (
              <li data-status="pass">No issues found in this type scale.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
