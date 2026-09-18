# 2026-09-19 — Settings belongs to the open workspace

Home had a TopNav gear that opened preview frames. Those widths live on
the workspace as `previewDevices`. A control on the project list implied
they were app-global, and on an empty Home the dialog could write frames
before a project existed.

## Home is the entrance

The TopNav is mark + Blueprint. No Settings. Create, import, and (later)
switch stay on the page. The dialog is not mounted on `/`. Going Home
closes it.

## The rail still owns frames

Studios keep the Settings row. Phone, tablet, desktop, and extra
desktops are this workspace’s list. Typography and layout Uses read it.
Layout tokens stay on Spacing and Radius.

Closing the dialog on Home is render-time state, not an effect. An
effect that called `setIsSettingsOpen(false)` failed lint at
`--max-warnings 0`. ScaleStudio already resets view state the same way
when the route changes.

## Checks

- `pnpm lint` at `--max-warnings 0`.
- Playwright: Home has no Settings; the rail opens this workspace’s
  frames. Home create / import. Shell: no rail on Home, Settings on the
  studio rail, Blueprint back to Home with no gear.

## Lessons

**A list page must not edit the document.** Frames are a slice of a
workspace. The entrance is create / import / switch.

**`setState` in an effect to close a dialog is a warning.** Adjusting
open state from the route during render is the allowed reset. The
collapsed-rail read from `localStorage` still belongs in an effect:
that is an external store, not a route.
