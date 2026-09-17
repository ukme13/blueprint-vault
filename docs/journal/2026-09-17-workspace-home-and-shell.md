# 2026-09-17 — Home create and the app shell

The workspace document was already one slice-aware store. The UI still
made the author invent colour and typography as two products. This lands
Stages 1 and 2 of `workspace-home-and-shell.md`. Stage 3 (retire the
leftover studio create doors) is still open.

The colour studio also lost Overview and landed on Shade generator from
an Impeccable pass on the same tree. That is chrome, not a second
product.

## Home

`/` is Home. Create is a name and one preset: the Blueprint seed, which
fills palette, semantics, type, and scale together. After Create, the
app opens `/colour` on Shade generator. Import is secondary. v1 only
knows the workspace already in this browser.

`workspaceHasStudios` is the existence check: a workspace is present if
palette or typography is non-null. Empty slices inside an existing
document are “not opened yet,” not “please create a project.” Home
always seeds every slice, so that case should be rare until someone
clears one from a leftover studio door.

## Shell

One Astryx `AppShell` + `SideNav` wraps every playground route.
Blueprint (mark and wordmark) is a link to Home. The rail is Colour,
Typography, Scale, Preview; it collapses to icons and keeps accessible
names. Below `md` the rail becomes a drawer. Theme lives under Settings,
not a fake profile. Studio topbars keep section tabs, Import, Export.

`WorkspaceNav` is deleted. Studio pages no longer own a `<main>`: the
shell already does.

Settings sits under the Blueprint heading rather than in the rail
footer. In `next dev`, Next’s overlay button occupies the bottom-left
and intercepts clicks on footer icons. Production does not have that
overlay; the heading slot is still the one a person can hit while
authoring.

## Colour bench

Overview is gone. Create from the leftover `/colour` door seeds
semantics in the same session. The matrix fills remaining width with a
floor of 168px plus 36px per weight. The desktop “all twenty weights
visible” assertion is at 1540px now, because the rail takes a column
the old 1280 viewport used to give the canvas.

## Checks

- Vitest `workspace` (`workspaceHasStudios`).
- Playwright `workspace-home`, `workspace-shell`, `palette-creation`,
  `studio-theme`, `preview-page`, `navigation`, `responsive-layout`,
  plus path updates on the existing studio specs. Theme specs open
  Settings first. `PLAYWRIGHT_BASE_URL` lets local runs hit port 4000.

## Lessons

**The rail is which studio; the topbar is which section.** Putting both
in one strip made Colour’s Shade / Semantics / Accessibility compete
with Typography for the same pixels, and it vanished under 640px with
no replacement.

**Seed every slice on Create, or Home and the leftover doors will fork
the document.** Stage 1 fills colour, type, and scale together. Stage 3
still has to stop Colour and Typography offering a second create card
when a slice is null.

**A 1280 desktop assertion is about the bench, not the window.** Once
the rail owns ~260px, twenty 36px weights plus the inspector no longer
fit. Widen the viewport in the test, or admit the matrix scroller; do
not shrink the cells below the floor the layout pass set.
