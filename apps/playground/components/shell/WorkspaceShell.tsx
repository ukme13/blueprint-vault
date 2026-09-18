"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/Layout";
import { LinkProvider } from "@astryxdesign/core/Link";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import {
  SideNav,
  SideNavCollapseButton,
  SideNavHeading,
  SideNavItem,
} from "@astryxdesign/core/SideNav";
import {
  previewShortcutDestination,
  previewShortcutReturnPath,
  useWorkspaceStore,
  workspaceHasStudios,
} from "@blueprint/ui";
import { ThemeControl } from "../ThemeControl";
import {
  BlueprintMark,
  ColourStudioIcon,
  ElevationStudioIcon,
  PreviewStudioIcon,
  RadiusStudioIcon,
  SettingsMark,
  SpacingStudioIcon,
  TypographyStudioIcon,
} from "./shell-marks";
import { WorkspaceSettingsDialog } from "./WorkspaceSettings";
import { WorkspaceNameField } from "./WorkspaceNameField";

const RAIL_COLLAPSED_KEY = "blueprint.shell.rail-collapsed";
const PREVIEW_RETURN_KEY = "blueprint.shell.preview-return";

const STUDIOS = [
  { href: "/colour", label: "Colour", icon: ColourStudioIcon },
  { href: "/typography", label: "Typography", icon: TypographyStudioIcon },
  { href: "/spacing", label: "Spacing", icon: SpacingStudioIcon },
  { href: "/radius", label: "Radius", icon: RadiusStudioIcon },
  { href: "/elevation", label: "Elevation", icon: ElevationStudioIcon },
  { href: "/preview", label: "Preview", icon: PreviewStudioIcon },
] as const;

function isCurrentStudio(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function shouldIgnorePreviewShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(
    target.closest(
      "input, textarea, select, button, [role='button'], [role='tab'], [role='radio'], [role='checkbox'], [role='switch'], [role='slider'], [role='menuitem'], [role='option'], [role='textbox'], [role='combobox'], [role='dialog'], [role='menu'], [role='listbox'], [role='alertdialog']",
    ),
  );
}

/**
 * One app frame for Home and the studios.
 *
 * Home has a TopNav (mark + Blueprint) and no tool rail. Studios get
 * Blueprint back to Home, the name under that heading, Colour /
 * Typography / Spacing / Radius / Elevation / Preview, theme on the
 * rail, and Settings as a rail row (this workspace's preview frames).
 * Space also swaps the current studio with `/preview`.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const workspace = useWorkspaceStore();
  const isHome = pathname === "/";
  const [collapsed, setCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  if (isHome && isSettingsOpen) {
    setIsSettingsOpen(false);
  }

  useEffect(() => {
    /* Reading localStorage must happen in an effect: a useState initializer
       would run during SSR, where window does not exist, and desync
       hydration. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1");
  }, []);

  const onCollapsedChange = useCallback((next: boolean) => {
    setCollapsed(next);
    window.localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
  }, []);

  useEffect(() => {
    if (isHome) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " && event.code !== "Space") return;
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (shouldIgnorePreviewShortcut(event.target)) return;

      event.preventDefault();
      const stored = window.sessionStorage.getItem(PREVIEW_RETURN_KEY);
      const next = previewShortcutDestination(pathname, stored);
      const remember = previewShortcutReturnPath(pathname);
      if (remember) {
        window.sessionStorage.setItem(PREVIEW_RETURN_KEY, remember);
      }
      router.push(next);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isHome, pathname, router]);

  useEffect(() => {
    if (isHome || !workspace.hasLoaded) return;
    if (workspaceHasStudios(workspace.project)) return;
    router.replace("/");
  }, [isHome, router, workspace.hasLoaded, workspace.project]);

  return (
    <LinkProvider component={Link}>
      <AppShell
        contentPadding={0}
        height="fill"
        variant="section"
        topNav={
          isHome ? (
            <TopNav
              label="Blueprint"
              heading={
                <TopNavHeading
                  heading="Blueprint"
                  headingHref="/"
                  logo={
                    <NavIcon icon={<Icon icon={BlueprintMark} size="sm" />} />
                  }
                />
              }
            />
          ) : undefined
        }
        sideNav={
          isHome ? undefined : (
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
                  icon={<Icon icon={BlueprintMark} size="sm" />}
                />
              }
              topContent={
                <VStack gap={2}>
                  {!collapsed ? <WorkspaceNameField /> : null}
                  <ThemeControl collapsed={collapsed} />
                </VStack>
              }
              footerIcons={<SideNavCollapseButton />}
            >
              <SideNavItem
                icon={SettingsMark}
                label="Settings"
                onClick={(event) => {
                  event.preventDefault();
                  setIsSettingsOpen(true);
                }}
              />
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
          )
        }
      >
        {children}
        {isHome ? null : (
          <WorkspaceSettingsDialog
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
          />
        )}
      </AppShell>
    </LinkProvider>
  );
}
