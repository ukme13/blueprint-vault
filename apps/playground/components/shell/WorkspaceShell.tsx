"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { LinkProvider } from "@astryxdesign/core/Link";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { SideNav, SideNavItem } from "@astryxdesign/core/SideNav";
import {
  Button,
  browserWorkspaceStorage,
  defaultRadiusScale,
  generatePalettes,
  loadStoredLibrary,
  paletteCssVariables,
  previewShortcutDestination,
  previewShortcutReturnPath,
  radiusCssVariables,
  useWorkspaceStore,
  workspaceHasStudios,
  type ColorTrack,
} from "@blueprint/ui";
import { docsLink } from "../../lib/docs-url";
import { STUDIO_VERSION } from "../../lib/studio-version";
import { ThemeControl } from "../ThemeControl";
import { NewTabLink } from "./NewTabLink";
import { RailBrand } from "./RailBrand";
import { RAIL_MOTION, railMotionStyle } from "./rail-motion";
import {
  BlueprintWordmark,
  ColourStudioIcon,
  ElevationStudioIcon,
  OverviewStudioIcon,
  PreviewStudioIcon,
  RadiusStudioIcon,
  SettingsMark,
  SpacingStudioIcon,
  StudioGuideIcon,
  TypographyStudioIcon,
} from "./shell-marks";
import { WorkspaceSettingsDialog } from "./WorkspaceSettings";
import { WorkspaceNameField } from "./WorkspaceNameField";
import styles from "./workspace-shell.module.css";

const RAIL_COLLAPSED_KEY = "blueprint.shell.rail-collapsed";
const PREVIEW_RETURN_KEY = "blueprint.shell.preview-return";
const EMPTY_PALETTES: ColorTrack[] = [];

/**
 * The guide on the docs site. Another application, so an absolute URL from the
 * environment rather than a route, and it opens in a new tab: a guide is a
 * reference somebody comes back from, and losing the studio to read about it
 * is the wrong way round.
 */
const STUDIO_GUIDE_HREF = docsLink("studio");

const STUDIOS = [
  { href: "/colour", label: "Colour", icon: ColourStudioIcon },
  { href: "/typography", label: "Typography", icon: TypographyStudioIcon },
  { href: "/spacing", label: "Spacing", icon: SpacingStudioIcon },
  { href: "/radius", label: "Radius", icon: RadiusStudioIcon },
  { href: "/elevation", label: "Elevation", icon: ElevationStudioIcon },
  { href: "/preview", label: "Preview", icon: PreviewStudioIcon },
  { href: "/overview", label: "Overview", icon: OverviewStudioIcon },
] as const;

function isCurrentStudio(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function shouldIgnorePreviewShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(
    target.closest(
      "input, textarea, select, button, [role='button'], [role='tab'], [role='radio'], [role='checkbox'], [role='switch'], [role='slider'], [role='menuitem'], [role='option'], [role='textbox'], [role='combobox'], [role='dialog'], [role='menu'], [role='listbox'], [role='alertdialog'], [aria-haspopup='dialog']",
    ),
  );
}

/**
 * One app frame for Home and the studios.
 *
 * Home has a TopNav (horizontal wordmark, 72px bar) and no tool rail.
 * Studios get the wordmark (Home) with collapse on the heading, the B
 * that expands on hover when the rail is closed, then the name under
 * that heading, Colour /
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
  const [drawerOpenedOn, setDrawerOpenedOn] = useState(pathname);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  if (isHome && isSettingsOpen) {
    setIsSettingsOpen(false);
  }

  const palettes = useMemo(
    () =>
      workspace.project?.palette
        ? generatePalettes(workspace.project.palette)
        : EMPTY_PALETTES,
    [workspace.project],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const variables = paletteCssVariables(palettes);
    const keys = Object.keys(variables);

    for (const [key, value] of Object.entries(variables)) {
      root.style.setProperty(key, value);
    }

    return () => {
      for (const key of keys) {
        root.style.removeProperty(key);
      }
    };
  }, [palettes]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const variables = radiusCssVariables(
      workspace.project?.radius ?? defaultRadiusScale(),
    );
    const keys = Object.keys(variables);
    /* Astryx Theme re-seeds `--radius-*` in rem on `[data-astryx-theme]`,
       which sits between `:root` and every studio. Writing only on
       `documentElement` left Overview (and shell buttons) on Neutral's
       10px element. Inline on the theme wrapper wins for descendants;
       `:root` still covers body-portaled chrome. */
    const roots = [
      document.documentElement,
      ...Array.from(document.querySelectorAll("[data-astryx-theme]")).filter(
        (node): node is HTMLElement => node instanceof HTMLElement,
      ),
    ];
    const uniqueRoots = [...new Set(roots)];

    for (const root of uniqueRoots) {
      for (const [key, value] of Object.entries(variables)) {
        root.style.setProperty(key, value);
      }
    }

    return () => {
      for (const root of uniqueRoots) {
        for (const key of keys) {
          root.style.removeProperty(key);
        }
      }
    };
  }, [workspace.project?.radius]);

  useEffect(() => {
    /* Reading localStorage must happen in an effect: a useState initializer
       would run during SSR, where window does not exist, and desync
       hydration. */
    const isStored = window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1";

    /* A phone starts with the drawer shut whatever the stored preference
       says. The preference is about how wide a rail should be beside the
       content; below 768px the rail is over the content, and "expanded" there
       means a drawer covering the studio before anybody asked for one. */
    const isNarrow = window.matchMedia("(max-width: 768px)").matches;
    const shut = isStored || isNarrow;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(shut);

    setIsNavCollapsed(shut);

    setIsHydrated(true);
  }, []);

  const onCollapsedChange = useCallback((next: boolean) => {
    setCollapsed(next);
    window.localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsNavCollapsed(collapsed);
      return;
    }

    if (collapsed) {
      // Unmount the expanded chrome once its fade-out has finished. See
      // rail-motion.ts for why this sits between the fade and the width.
      const timer = window.setTimeout(() => {
        setIsNavCollapsed(true);
      }, RAIL_MOTION.UNMOUNT_MS);
      return () => window.clearTimeout(timer);
    } else {
      // Mount expanded chrome immediately so it fades in with the width

      setIsNavCollapsed(false);
    }
  }, [collapsed, isHydrated]);

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
    /* Import writes storage and then navigates. React state can still be the
       empty snapshot for that first studio render, and treating that as "no
       project" bounced Home — where the name field the tests look for never
       mounts. Storage is the document that just landed. */
    const stored = loadStoredLibrary(browserWorkspaceStorage());
    if (workspaceHasStudios(stored.current)) return;
    router.replace("/");
  }, [isHome, router, workspace.hasLoaded, workspace.project]);

  /* Below 768px the rail is a drawer over the page, so a destination tapped
     inside it has to close it — otherwise the next studio opens behind a
     drawer still covering it. Adjusted during render rather than in an effect,
     which is React's own pattern for state that follows a prop and the one
     the lint rule asks for.

     Above the breakpoint this is the collapse state, and collapsing the rail
     on every navigation would be wrong — so it only closes what was open, and
     an expanded rail on a desktop is never "open" in that sense because the
     drawer rules do not apply to it. */
  if (drawerOpenedOn !== pathname) {
    setDrawerOpenedOn(pathname);
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setCollapsed(true);
    }
  }

  return (
    <LinkProvider component={Link}>
      <AppShell
        contentPadding={0}
        height="fill"
        /* AppShell keeps out of it. The rail is its own drawer below 768px,
           in CSS, so the first paint is already right; AppShell decides the
           same thing after hydration, and running both left a phone with an
           empty bar and a drawer nothing opened. `false` removes the rail
           from a narrow screen altogether, which is worse than either. See
           workspace-shell.module.css. */
        mobileNav={{ breakpoint: "none" }}
        variant="section"
        topNav={
          isHome ? (
            <TopNav
              className={styles.homeNav}
              label="Blueprint"
              heading={
                <TopNavHeading
                  headingHref="/"
                  logo={<BlueprintWordmark />}
                  logoLabel="Blueprint"
                />
              }
              endContent={
                <Button
                  href={STUDIO_GUIDE_HREF}
                  leftIcon={<StudioGuideIcon />}
                  rel="noreferrer"
                  scheme="neutral"
                  size="small"
                  target="_blank"
                  variant="text"
                >
                  Studio guide
                </Button>
              }
            />
          ) : undefined
        }
        sideNav={
          isHome ? undefined : (
            <SideNav
              aria-label="Blueprint workspaces"
              className={styles.sideNav}
              style={railMotionStyle()}
              data-collapsed={collapsed}
              data-hydrated={isHydrated}
              collapsible={{
                hasButton: false,
                isCollapsed: isNavCollapsed,
                onCollapsedChange,
              }}
              header={
                <RailBrand
                  collapsed={collapsed}
                  isNavCollapsed={isNavCollapsed}
                  onCollapsedChange={onCollapsedChange}
                />
              }
              /* Pinned to the bottom, apart from the studios: it is not one
                 of them, and it leaves the app. Same item and size as the
                 studios, so its icon keeps the rail's 20px column. */
              footer={
                <VStack gap={0.5}>
                  <SideNavItem
                    as={NewTabLink}
                    href={STUDIO_GUIDE_HREF}
                    icon={StudioGuideIcon}
                    label="Studio guide"
                    size="lg"
                  />
                  {/* Expanded only: the collapsed rail stays icon-only. Mounted
                      on the same delayed switch as the rest of the expanded
                      chrome and faded on the immediate one, so it leaves with
                      the name field instead of popping. Kept on one line and
                      clipped, so it never wraps while the width animates. On
                      the rail's 16px column, level with the icons above. */}
                  {isNavCollapsed ? null : (
                    <div
                      className="grid gap-1 overflow-hidden whitespace-nowrap px-2 pt-2 transition-opacity data-[collapsing=true]:opacity-0"
                      data-collapsing={collapsed}
                      style={{ transitionDuration: "var(--rail-fade)" }}
                    >
                      <p className="m-0 font-mono text-[11px] text-fg-muted">
                        v{STUDIO_VERSION}
                      </p>
                    </div>
                  )}
                </VStack>
              }
              topContent={
                <VStack gap={2} className={styles.topVStack}>
                  <WorkspaceNameField
                    collapsed={collapsed}
                    isNavCollapsed={isNavCollapsed}
                    onExpand={() => onCollapsedChange(false)}
                  />
                  <div className={styles.dividerWrapper}>
                    <Divider className={styles.railDivider} />
                  </div>
                  <ThemeControl
                    collapsed={collapsed}
                    isNavCollapsed={isNavCollapsed}
                  />
                </VStack>
              }
            >
              <VStack gap={0.5}>
                <SideNavItem
                  icon={SettingsMark}
                  label="Settings"
                  size="lg"
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
                    endContent={
                      studio.href === "/preview" && !isNavCollapsed ? (
                        /* Hidden from assistive tech: the footer says the same
                           thing in words, and a spec names this link exactly
                           "Preview", which the badge text would change. */
                        <kbd
                          aria-hidden="true"
                          className="rounded border border-border-subtle bg-surface-subtle px-1 py-0.5 font-mono text-[10px] text-fg-muted"
                        >
                          Space
                        </kbd>
                      ) : undefined
                    }
                    isSelected={isCurrentStudio(pathname, studio.href)}
                    label={studio.label}
                    size="lg"
                  />
                ))}
              </VStack>
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

      {/* Opens the drawer. The rail's own expand control goes off-canvas with
          the rail, so below 768px there has to be something left on screen —
          measured: with the drawer shut and no trigger, every studio route was
          unreachable again, one fix later. Hidden above the breakpoint, where
          the rail is a column and expands itself. */}
      {!isHome && collapsed ? (
        <IconButton
          className={styles.railTrigger}
          icon={<Icon icon="menu" />}
          label="Open navigation"
          size="md"
          variant="ghost"
          onClick={() => onCollapsedChange(false)}
        />
      ) : null}

      {/* Dismisses the drawer, and only exists while there is a drawer to
          dismiss. A button rather than a div: it is a control, it takes focus
          in order, and Escape is handled by the rail itself. */}
      {!isHome && !collapsed ? (
        <button
          aria-label="Close navigation"
          className={styles.railBackdrop}
          type="button"
          onClick={() => onCollapsedChange(true)}
        />
      ) : null}
    </LinkProvider>
  );
}
