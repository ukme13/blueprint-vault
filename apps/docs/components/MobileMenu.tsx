"use client";

import { useState } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { MobileNav } from "@astryxdesign/core/MobileNav";
import type { DocsRouteGroup } from "@blueprint/ui/docs-routes";
import { DocsNav } from "./DocsNav";

/**
 * Navigation for a screen too narrow to hold a sidebar.
 *
 * Below 800px the sidebar is not shown — a 260px column on a 390px screen
 * leaves 130px of reading. Hiding it was half a decision: it left a reader on
 * a phone with no way from one page to another at all.
 *
 * Astryx's `MobileNav` rather than a drawer written here. Outside `AppShell`
 * it takes `isOpen` and `onOpenChange` and still does the work that is easy to
 * get wrong: a modal dialog that traps focus, closes on Escape and on the
 * backdrop, and returns focus to the trigger.
 *
 * Every group, not the one this page is in. The sidebar narrows to the current
 * section because the header carries the others; on a phone the header's
 * section links are the first thing to run out of room, so the drawer is the
 * whole map or it is not a map.
 *
 * The toggle and the drawer are hidden above the breakpoint in CSS rather than
 * by measuring the viewport here. A component that renders differently before
 * and after hydration flashes, and the width is a styling question that CSS
 * already answers.
 */

interface MobileMenuProps {
  groups: readonly DocsRouteGroup[];
  /** The current page's path, with no leading slash. */
  currentPath: string;
}

export function MobileMenu({ groups, currentPath }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(currentPath);

  /* Close when the page changes, adjusted during render rather than in an
     effect — React's own pattern for state that has to follow a prop, and the
     one the lint rule is pointing at when it warns about cascading renders.

     Today it cannot fire: the links are plain anchors, so a navigation is a
     full page load and this component is built again from nothing. It is here
     so that the drawer closing on navigation is true by construction rather
     than true because of how the links happen to be written. */
  if (openedOn !== currentPath) {
    setOpenedOn(currentPath);
    setIsOpen(false);
  }

  return (
    <div className="mobile-menu">
      <IconButton
        aria-expanded={isOpen}
        icon={<Icon icon="menu" />}
        label="Open navigation"
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen(true)}
      />

      <MobileNav
        header="Documentation"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        side="start"
      >
        <DocsNav currentPath={currentPath} groups={groups} />
      </MobileNav>
    </div>
  );
}
