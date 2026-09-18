# Workspace home and app shell

## Goal

Create a system once — name + one preset — and land on the colour bench. Stop
asking the author to create colour and typography as separate projects. Put the
studios behind one left rail, with Blueprint returning to Home.

## Why now

The workspace document already exists (`blueprint.workspace.v1`): one name,
palette, typography, semantics, and scales in a single slice-aware store. See
[workspace-project-merge.md](workspace-project-merge.md). The UI still behaves
as if each studio were its own product:

- Colour has a create door (colours + method tiles).
- Typography has its own create door.
- Scale and Preview assume something is already there.
- Studio links live in a topbar strip next to section tabs and theme controls.

An author who wants “a Blueprint system” has to invent it twice. That is the
friction. It is not missing a marketing dashboard — Colour’s Overview vanity
surface was deliberately removed as Calibration Bench chrome.

## Decisions locked

These are product decisions, not open questions:

1. **One create path on Home.** Name (required) + preset. For v1 there is a
   single preset: **Blueprint seed** — the same seed a saved workspace already
   gets (palette tracks, semantics, type, spacing / radius / elevation). No
   brand colour pickers, no “how do you want to start?” cards on create.
2. **After Create, land on Colour → Shade generator.** Fastest path to the
   instrument. Edit type and scale later from the rail.
3. **Import** is secondary on Home (“Open a `.blueprint.json`”), not a create
   method.
4. **Left rail** holds Colour / Typography / Spacing / Radius / Elevation /
   Preview. Collapsible to icons only. Studio-specific tools stay inside the
   studio, not in the rail. `/scale` redirects to Spacing.
5. **Blueprint** (mark / wordmark) navigates to Home.
6. **Theme** is Light / Dark / System on the expanded studio rail, and a
   sun/moon menu when the rail is collapsed. Home has a TopNav (mark + name)
   and no tool rail. **Settings** is preview frames only (a gear beside
   Theme on studios and on the Home TopNav). Layout uses live on Spacing
   and Radius as a Uses section, like Semantics on Colour. No profile
   avatar and no Logout until there is real auth — storage is still this
   browser’s `localStorage`.
7. **Do not bring back Colour Overview** as a vanity dashboard. Opening Colour
   still lands on the shade bench. A later optional **System** rail item for
   handover readiness is allowed only if it argues export / a11y / slices, not
   hero metrics.

## What exists today

- `seedWorkspace` / `semanticsForPalette` / `emptyWorkspace` in `@blueprint/ui`
  already know how to mint a full workspace from a palette (and null semantics
  vs empty array matters for reseeding).
- Colour create now seeds semantics same-session and opens Shade generator
  (Impeccable onboard). Creation UI was distilled to a short form; this plan
  moves that responsibility to Home and retires per-studio doors.
- Routes: `/` Home (project list, no rail), `/colour`, `/typography`,
  `/spacing`, `/radius`, `/elevation`, `/preview`. `/scale` redirects to
  spacing. Studios render inside `WorkspaceShell` with the left rail.
  Studio section tabs stay in each studio topbar. Home create is a
  dialog. The workspace name sits under Blueprint on the rail. Preview
  frames live in Settings. Layout uses live on Spacing / Radius → Uses.
- Persistence: one workspace key; studios write their own slices via
  `updateStoredWorkspace`. Home must create through that path, not invent a
  second document type.

## The hazard this creates

**Two create UIs during migration.** If Home can create a full workspace while
Colour and Typography still show their own create screens when a slice is null,
authors will fork state (palette present, type null, or the reverse). The
migration stage must pick one rule: a workspace either exists or it does not;
empty slices inside an existing workspace are “not opened yet,” not “please
create a project.”

**Rail vs section tabs.** Colour still has Shade / Semantics / Accessibility
as in-studio sections. Those stay in the studio topbar (or equivalent). The
rail is for _which studio_, not which colour tab.

**Collapse and narrow viewports.** Icon-only rail must keep accessible names.
Below a breakpoint, prefer a temporary drawer or top overflow over hiding the
rail with no replacement (current topnav already disappears under 640px).

## Stages

### Stage 1 — Home create ✅ done

`/` is Home. Create is name + Blueprint seed (`seedWorkspaceProject`) → persist
→ `/colour` Shade generator. Import is secondary. v1 lists only the current
browser workspace.

### Stage 2 — App shell ✅ done

Shared shell: Blueprint → Home, collapsible left rail on studios (Colour /
Typography / Spacing / Radius / Elevation / Preview), theme as a segmented
control on the expanded rail and a sun/moon menu when collapsed, project
name under Blueprint. Home has no tool rail. Studio pages render inside
the shell. Section tooling stays local. `WorkspaceNav` is gone.

### Stage 3 — Retire studio create doors

- When a workspace exists, Colour / Typography never show a full-page create
  card. Empty slice → short empty state (“Seed from Blueprint” / “This slice
  isn’t open yet”) that fills from the same seed helpers, or simply rely on
  Stage 1 always seeding all slices.
- Preferred: Stage 1 seeds **all** slices so empty states are rare.

### Stage 4 — Optional follow-ons

- Multiple named workspaces in this browser (switcher on Home).
- Settings grows (density, reduced motion preference if not OS-driven).
  Preview frames already live there. Layout uses are Spacing / Radius → Uses.
- Auth / profile / logout — only with a backend.
- Optional System page for handover readiness.
- Export clarify: Handover primary (separate from this plan; see colour-studio
  critique P2).

## URL sketch (informative)

One coherent option:

| Path          | Role                                              |
| ------------- | ------------------------------------------------- |
| `/`           | Home (create / import / open current)             |
| `/colour`     | Colour studio (shade / semantics / accessibility) |
| `/typography` | Typography studio                                 |
| `/spacing`    | Spacing scale                                     |
| `/radius`     | Radius scale                                      |
| `/elevation`  | Elevation scale                                   |
| `/preview`    | Preview                                           |

Redirect legacy `/` colour deep-links if the app today treats `/` as Colour.
Exact paths are an implementation choice; the table is the product intent.

## Out of scope

- Ferre / first product app ([first-product.md](first-product.md)) — still
  unaccepted.
- Redesigning semantic table, type roles, or scale maths.
- Replacing local persistence with a server.
- Recreating Overview dashboards inside studios.

## Done when

- An author can create a named workspace with one preset and be editing colour
  shades without visiting typography create.
- Colour, Typography, Spacing, Radius, Elevation, and Preview are reachable
  from one collapsible rail; Blueprint returns to Home.
- Theme is available without a fake logged-in profile.
- Studio create doors no longer fork the workspace into half-built documents.
