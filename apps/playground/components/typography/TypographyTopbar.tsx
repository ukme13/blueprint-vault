"use client";

import type { ComponentProps } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@blueprint/ui";
import { PreviewDeviceBar } from "./PreviewDeviceBar";
import type { TypographySection } from "./types";
import styles from "./typography-workspace.module.css";

interface TypographyTopbarProps {
  section: TypographySection;
  onSectionChange: (section: TypographySection) => void;
  onExport: () => void;
  deviceBar: ComponentProps<typeof PreviewDeviceBar>;
  /** The Warnings tab's count, so the phone's badge is not a second number. */
  warningCount: number;
  /** Opens the settings sheet on a phone. */
  onOpenSettings: () => void;
}

/** The studio's views and Export, then the device bar and, on a phone, the
    way to the settings. */
export function TypographyTopbar({
  section,
  onSectionChange,
  onExport,
  deviceBar,
  warningCount,
  onOpenSettings,
}: TypographyTopbarProps) {
  return (
    <>
      <header className={styles.topbar}>
        <nav aria-label="Typography views" className={styles.navigation}>
          <TabList
            size="sm"
            value={section}
            onChange={(value) => onSectionChange(value as TypographySection)}
          >
            <Tab label="Editor" value="editor" />
            <Tab label="Specimen" value="specimen" />
            <Tab label="Preview" value="preview" />
          </TabList>
        </nav>
        <span className={styles.headerActions}>
          <Button
            aria-label="Export type scale"
            scheme="neutral"
            size="medium"
            variant="outlined"
            onClick={onExport}
          >
            Export
          </Button>
        </span>
      </header>

      <section aria-label="Typography toolbar" className={styles.toolbar}>
        <PreviewDeviceBar {...deviceBar} />
        {/* A phone's way to the settings. CSS shows it only there. */}
        <span className={styles.settingsTrigger}>
          <IconButton
            icon={<SlidersHorizontal aria-hidden className="size-4" />}
            label={
              warningCount > 0
                ? `Type settings, ${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`
                : "Type settings"
            }
            size="md"
            variant="secondary"
            onClick={onOpenSettings}
          />
          {warningCount > 0 && (
            <span aria-hidden className={styles.settingsBadge}>
              <Badge label={String(warningCount)} variant="warning" />
            </span>
          )}
        </span>
      </section>
    </>
  );
}
