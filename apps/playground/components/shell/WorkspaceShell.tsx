"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { VStack } from "@astryxdesign/core/Layout";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Popover } from "@astryxdesign/core/Popover";
import {
  SideNav,
  SideNavCollapseButton,
  SideNavHeading,
  SideNavItem,
} from "@astryxdesign/core/SideNav";
import { ThemeControl } from "../ThemeControl";
import {
  BlueprintMark,
  ColourStudioIcon,
  PreviewStudioIcon,
  ScaleStudioIcon,
  TypographyStudioIcon,
} from "./shell-marks";

const RAIL_COLLAPSED_KEY = "blueprint.shell.rail-collapsed";

const STUDIOS = [
  { href: "/colour", label: "Colour", icon: ColourStudioIcon },
  { href: "/typography", label: "Typography", icon: TypographyStudioIcon },
  { href: "/scale", label: "Scale", icon: ScaleStudioIcon },
  { href: "/preview", label: "Preview", icon: PreviewStudioIcon },
] as const;

function isCurrentStudio(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * One app frame for Home and the studios.
 *
 * Blueprint returns to Home. The rail is which studio. Theme sits under
 * Settings so the topbar can keep section tools (tabs, export) without a
 * second copy of the studio list.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1");
  }, []);

  const onCollapsedChange = useCallback((next: boolean) => {
    setCollapsed(next);
    window.localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
  }, []);

  return (
    <LinkProvider component={Link}>
      <AppShell
        contentPadding={0}
        height="fill"
        variant="section"
        sideNav={
          <SideNav
            aria-label="Blueprint workspaces"
            collapsible={{
              hasButton: false,
              isCollapsed: collapsed,
              onCollapsedChange,
            }}
            header={
              <SideNavHeading
                heading="Blueprint"
                headingHref="/"
                icon={<BlueprintMark />}
              />
            }
            topContent={
              <Popover
                alignment="start"
                label="Settings"
                placement="end"
                width={280}
                content={
                  <VStack gap={3}>
                    <ThemeControl />
                  </VStack>
                }
              >
                <IconButton
                  icon={<Icon icon="wrench" />}
                  label="Settings"
                  size="sm"
                  variant="ghost"
                />
              </Popover>
            }
            footerIcons={<SideNavCollapseButton />}
          >
            {STUDIOS.map((studio) => (
              <SideNavItem
                key={studio.href}
                href={studio.href}
                icon={studio.icon}
                isSelected={isCurrentStudio(pathname, studio.href)}
                label={studio.label}
              />
            ))}
          </SideNav>
        }
      >
        {children}
      </AppShell>
    </LinkProvider>
  );
}
