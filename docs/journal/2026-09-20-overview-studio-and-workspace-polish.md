# 2026-09-20 — Overview studio, Home polish, and recovered tone chrome

A workspace that already has colour, type, scale, and a landing preview still
had no page that showed those slices together. Home cards also read as a
switcher with no age, no empty-palette mark, and no export without opening the
studio. This branch adds the specimen board, polishes the library cards, and
recovers Semantics chrome that had been sitting on a side branch.

## Overview is a specimen, not Colour vanity

`/overview` sits on the rail below Preview. Four columns: colour families with
their 25-interval ramps, type roles with live Aa, button and progress
specimens, search / nav / action tools. Every fill comes from the open
workspace. Vision sits in the header the same way it does on Colour.

The home-and-shell plan still forbids bringing Colour Overview back as a
vanity dashboard. Opening Colour still lands on the shade bench. This page is
the later “system” slot used as a live board of what the project actually
holds, not hero metrics and not handover readiness.

## Hide what the project does not have

The first draft filled missing tracks and roles from `seedPaletteProject` /
`seedTypographyProject`. A Secondary button then painted teal on a
primary-only file, which is a lie.

Option 1: omit the tile. Colour cards map the project's tracks only. Type
cards take up to three real roles (headline / body / label, then leftover
roles) and stop. Secondary button, tertiary icon, error delete tool, and the
progress bars that would have used those colours are not rendered. Primary
spans both button columns when Secondary is gone. Empty columns get a quiet
“No color families” / “No typography roles” card instead of a fake ramp.

A CSS variable still needs a fallback (`var(--color-surface-overlay,
var(--color-surface-raised))`) so a missing token does not collapse layout.
That is chrome. Specimens that name a colour must not invent one.

## Home cards

`updatedAt` stamps the document on save. Cards show `formatRelativeTime`
(“Edited 2 hours ago”). Zero-family mosaics render a textured grid instead of
a blank well. The card menu exports `.blueprint.json` without opening the
studio. Capacity is `2 / 8 projects used`, not an alert. Rename is a dialog.

## Preview reset

Slot and section inspectors get “Reset to default” when a block has overrides.
The Preview header has the same action beside Vision. The seed is the
Designally landing, so reset is back to that page, not an empty specimen.

Default style edits stay on the one slot. A second control paints the rest of
the style group. Changing every heading because you inspected one was the
wrong default.

## Tokens at the shell

Palette CSS variables used to be injected inside Colour. Settings, dialogs,
and portals sit outside that subtree, so “Add desktop” sometimes painted the
Astryx fallback orange. `WorkspaceShell` now writes `paletteCssVariables` onto
`document.documentElement` for the current project, on every studio route.
Colour Studio stopped writing the same map a second time.

## Button tone chrome that never landed

`fix/button-tones-chrome` made two visible edits and never merged:

- Each tone action reads **Remove**. `aria-label` stays `Remove {tone} tone`,
  so the lock row and the Info-removal spec can still tell them apart.
- **New group** is `variant="outlined"`, not a text control that looked like a
  heading.
- `.toneRemove { flex-shrink: 0 }` so a long tone name cannot squeeze the
  action off the row.

The data model (workspace `buttonSchemes`, drop Info) was already on main.
The chrome was not. Semantics on this branch still showed “Remove Secondary
tone” as the visible label and “New group” as plain text. Recovered here so
the list matches what that fix already proved.

## Elevation thumb

At origin `60% 60%` the pad thumb sat on the corner and clipped. The pad
keeps an inset ratio so the circle stays inside the well at the max
coordinates.

## Checks

- `pnpm lint` at `--max-warnings 0`.
- Vitest: 67 files, 1119 tests (`format-time`, `library` `updatedAt`,
  `preview-document` seed, `palette` / `semantic` CSS variable helpers).
- Playwright, Chromium from `$LOCALAPPDATA\ms-playwright`:
  `overview-page` (full board, and a one-track project hides Secondary /
  Shapes / Delete), `workspace-home`, `preview-page` (reset),
  `workspace-settings` (root tokens), `spacing-studio` (thumb),
  `semantic-table` (Remove Info tone, outlined New group).

The recovery environment did not have Chromium. The specs ran on this
checkout.

## Lessons

**A specimen that invents a colour is worse than a hole.** Fallbacks belong
on chrome tokens. A Secondary button is a claim about the project.

**Portals do not inherit the studio.** Dialogs, menus, and Settings render
under `document.body`. Palette variables have to live on the root, not on
the page that first needed them.

**A merged model is not a merged UI.** Button tones as workspace data landed.
The sidebar still said “Remove Secondary tone” until the chrome commit was
lifted onto this branch. Visible caption and accessible name can (and should)
disagree when the row is tight.

**Reset needs a named default, not “whatever was first painted.”** The
Designally file is that default. Without it, reset would restore the old
catalogue preview.

**Inspector group edits are opt-in.** One slot is the selection. Painting the
group is a second click, not the default.
