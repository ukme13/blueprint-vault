# 2026-09-17 — Home as a project list, theme beside the rail

The shell from the morning put a tool rail on every route, including
Home, and hid theme under a wrench. The reference Home is a project
grid with New project as a modal; the studio chrome puts the name under
Blueprint and theme in a sun/moon menu that opens beside the nav.

## Home

`/` no longer carries the studio SideNav. The page is a Projects header,
an import action, and New project, which opens a form dialog (name +
Blueprint seed). v1 still stores one workspace; that document is one
card with a shade mosaic, not a second persistence model.

## Rail

Colour uses a paintbrush, Typography a T. The editable project name sits
under the Blueprint heading so the studio topbars can keep section tools
only. Theme is Light / Dark / System as menu items, not a segmented
control inside a Settings popover.

Studios still persist their own slices. They no longer write the
workspace name: a rename on the rail was being overwritten by the copy
the studio loaded. Home, the rail, and the studios share one
`WorkspaceStoreProvider` so an import or a rename is the same document.

## Checks

Playwright `workspace-home`, `workspace-shell`, `studio-theme`,
`preview-page` theme cases, `typography-creation`, and the Home create /
import paths on `workspace-interactions`. `openTheme` clicks Theme and
looks for menuitems.

## Lessons

**Home is not a studio.** A rail on an empty project list implies the
tools exist before the document does. Create first, then the rail.

**A name field in every topbar is three sources of truth.** One input on
the shell is the product; the studios have to stop writing that field
on persist or they will clobber it.
