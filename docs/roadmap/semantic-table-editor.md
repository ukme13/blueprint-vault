# The Semantics tab as a spreadsheet

## Goal

Make the Semantics tab work the way a designer already knows how to work:
a table with the modes across the top, rows that can be selected in bulk,
deleted, duplicated and moved into groups, values edited in place, and a
transparency on any reference. The reference is Figma's Variables panel,
and the interaction model is a spreadsheet.

Today the tab is a read-mostly table: nineteen-then-seventy-two names down
the side, light and dark across, one cell edited at a time, one row added
at a time, no selection, no undo, no alpha. It was built to prove the
layer, and it did. This plan turns it into the place a designer builds a
client's colour vocabulary.

## Why now

- The foundations plan is complete and the layer is stable. Every consumer
  (the Button tones, the bridge, the report, the docs pages, the export)
  reads the same slice, so an editor that changes the slice changes all of
  them without new wiring.
- The seed set grew from eleven to seventy-two roles this month. A table
  that could be lived in at nineteen rows cannot at seventy-two: finding,
  bulk repointing and grouping are now the daily operations.
- Transparency is the one thing the layer cannot express that a real system
  needs on day one: dividers, hover washes, disabled text, scrims. Every
  one of them is today a solid shade that approximates an alpha.

## System model

**A reference gains an alpha.** `SemanticReference` becomes
`{ trackId, weight, alpha? }` with alpha from 0 to 1 and absent meaning
opaque. The reference is still a reference: the token stores which
primitive and how transparent, never a resolved colour.

**Resolution composites.** `resolveSemantic(token, mode)` returns the
resolved colour with its alpha. Anything that measures (the report, the
similarity grid, the preview's contrast) composites the colour over the
surface it is measured on before measuring. A 60% black is a different
colour on cream and on white, and the report says which.

**Export keeps the alias.** CSS emits relative colour syntax so the alias
survives: `--color-divider: oklch(from var(--color-neutral-950) l c h / 12%)`.
Tailwind gets the same. DTCG emits the resolved value with the alpha and
records the reference and alpha in `$extensions`, because the DTCG alias
form has no alpha slot. The Astryx bridge is unchanged: it points at roles.

**Selection is a set of ids, held by the editor, not by the store.** The
store holds the layer; the editor holds which rows are selected and what
is being edited. Every operation on a selection (delete, duplicate, move to
group, repoint) is a pure function `SemanticToken[] -> SemanticToken[]` in
`packages/ui`, so it is testable without a browser and undo is a stack of
previous layers.

**Groups are prefixes.** The part of the id before the dot is the group,
as the export and the docs pages already treat it. A group sidebar is a
view over prefixes; "new group with selection" is a rename.

**Some roles are load-bearing.** The Button tone table, the Astryx bridge,
the report's pair rule and the preview page read named roles. A role one of
them reads carries a `usedBy` list and cannot be deleted, only repointed.
A role nothing reads can be deleted, and a deliberately removed seed role
is remembered in the slice so `fillSeedRoles` does not resurrect it.

## What exists today

- `SemanticEditor.tsx` (301 lines) renders an Astryx `Table` in compact
  density with per-cell editing and rename. It reads the workspace store
  and writes through `update`.
- `packages/ui/src/color/semantic.ts` holds the token shape, the seed set,
  `fillSeedRoles`, `migrateSemanticIds`, `renameSemanticToken`, and the
  resolution rules including the missing-reference state.
- `semanticPairIds` derives the report's pairs from the groups, and
  `BUTTON_TONES` in `button-tones.ts` names the roles the Button reads.
- `theme.css` carries the studio chrome's own copy of the seed roles; the
  e2e added in `fix/theme-static` fails when a seed role is missing from
  the compiled page.
- Nothing has alpha. `fg.disabled` and the hover washes are solid shades
  chosen to look like transparency.
- No undo exists anywhere in the studio. The store writes per slice on
  every edit.

Gaps worth knowing before starting: the Astryx `Table` in data-driven mode
handles selection, but the editor uses composed rows; the workspace file
version must move for alpha (a version-N reader given an alpha it does not
know would silently drop it); and the report's compositing touches every
contrast row, which is the largest test surface in the package.

## First version

Somebody can:

- See the groups in a sidebar with counts, click one to filter, search by
  name.
- Click a row to select, shift-click for a range, Ctrl/Cmd-click to add,
  Ctrl/Cmd-A for all visible.
- Delete the selection (Delete key or context menu), duplicate it, move it
  into a new or existing group, repoint every selected row's light or dark
  reference at once.
- Edit a name or a reference in place (Enter to commit, Escape to cancel,
  Tab to the next cell), with arrow keys moving the active cell.
- Set an alpha on any reference, see the swatch draw it over a checker,
  and see the report composite it over each surface.
- Undo and redo any of the above.
- Watch the preview, the Button page and the export follow every change,
  as they do today.

## Stages

1. **Alpha in the model, no UI.** The reference shape, the workspace file
   version and its migration (an absent alpha reads as opaque), resolution
   with alpha, compositing in the report and the similarity grid, and the
   three export formats with the alias preserved. Tests: a token at 12%
   resolves to the same colour in both modes with alpha; the report's row
   for a transparent foreground names the composited colour; every alias
   in the CSS export still resolves into the primitive output.

2. **Selection operations, no UI.** Pure functions in `packages/ui`:
   `deleteTokens`, `duplicateTokens` (new ids with a `-copy` suffix that
   never collides), `moveToGroup` (rename prefix, preserving order),
   `repointTokens` (one mode, one reference, many ids), and `usedBy` over
   the tone table, the bridge and the pair rule. A `removedSeedRoles` list
   in the slice that `fillSeedRoles` honours. Tests for each, including
   that a load-bearing role refuses deletion with the list of consumers.

3. **Undo.** A history of layers for the semantics slice with a bounded
   depth, in `packages/ui`, bound to Ctrl+Z / Ctrl+Shift+Z in the editor.
   Coalesce keystrokes inside one in-place edit into one step. Test that
   undo after a multi-delete restores order as well as content.

4. **The table.** Rebuild `SemanticEditor` on the Astryx `Table` in the
   mode that supports selection (read `astryx component Table` first;
   if selection is composed-only, compose it). Group sidebar, search,
   row selection with the keyboard rules above, context menu (Copy, Paste,
   New group with selection, Edit, Duplicate, Delete), Delete key, cell
   navigation and in-place editing. The `usedBy` badge on load-bearing
   rows, with the delete item disabled and the reason as its tooltip.
   Keep the component under 250 lines by splitting sidebar, table and
   context menu; the logic is already in stage 2.

5. **Alpha in the UI.** An alpha field beside each reference (a percent,
   like Figma), swatches drawn over a checker when alpha is under 100%,
   and the report and preview showing composited results. The seed set
   gains alpha where it has been faking it: `border.subtle`, `fg.disabled`,
   the hover surfaces, `surface.overlay`. Measured against the current
   solid values so the studio does not visibly change on the day.

6. **Docs and handover follow.** The semantic page shows alpha in the
   table and composites in its contrast rows; the handover archive carries
   the new CSS; the e2e for "alias, not copy" gains an alpha case.

Stage 1 lands with nothing consuming it, like every model stage before it,
because a file written with alpha by stage 5 must be readable by everything
in between.

## Not doing

- **Columns beyond light and dark.** A third mode (high contrast, a second
  brand) is the semantic plan's "later" item and is a different plan.
- **Drag to reorder rows.** Order follows the group and the seed; moving
  between groups is a rename, which is what the context menu does.
- **Alpha on primitives.** A primitive is a colour; transparency is a use.
  Alpha lives on the semantic reference only.
- **Paste from Figma.** Copy and paste are within the table. Import from
  Figma variables is its own plan if it is ever wanted.

## Safety and quality rules

**Every bulk operation is a pure function with a test before it has a
button.** Stage 4 wires stage 2; it does not contain logic.

**A load-bearing role cannot be deleted.** Enforced in the pure function,
not only in the menu, so no keyboard path or future caller can remove
`action.primary` from under the Button.

**Compositing is the only way a transparent colour is measured.** No
contrast row may read an alpha colour's raw value. A test puts a 50%
foreground on two different surfaces and asserts two different verdicts.

**Alias survives alpha.** A test follows every alias in the CSS export,
with and without alpha, into the primitive output.

**Undo restores order.** Not only which tokens exist, but where they sit.

**The studio does not visibly change on the day alpha ships.** Stage 5
seeds alpha to match the current solid values, measured, so the change
is in the model and not on screen.

## Definition of done

1. A reference can carry an alpha; every export keeps the alias; the report
   composites.
2. Rows can be multi-selected with the mouse and the keyboard, deleted,
   duplicated, grouped and repointed in bulk.
3. Names and references edit in place with spreadsheet keys.
4. Undo and redo cover every edit.
5. Load-bearing roles show what uses them and refuse deletion.
6. A deliberately removed seed role stays removed across a reload.
7. The docs page and the handover reflect alpha.

Unit tests cover stages 1 to 3 in full. Playwright covers range
selection, multi-delete with undo, duplicate, move to group, an alpha edit
followed through to the preview and the export.

## Decisions

Open, with a recommendation for each.

**How alpha is exported. Recommend: relative colour syntax, keeping the
alias.** `color-mix` is the alternative and also keeps the alias, but
mixes toward transparent through a colour space the client did not choose.
`oklch(from var(--x) l c h / a)` says exactly what the token says.
Browser support for relative colour syntax should be checked against the
project's stated browser floor before stage 1 starts.

**Whether seed roles can be deleted. Recommend: only the ones nothing
reads.** Figma allows any deletion because Figma has no Button reading the
variable. Here, deleting `action.primary` empties every primary button on
the next paint. The `usedBy` badge makes the reason visible instead of
mysterious.

**Where selection state lives. Recommend: the editor, not the store.**
Selection is not part of the design system and should not be saved,
synced across tabs or exported.

**Undo scope. Recommend: the semantics slice only, for now.** A studio-wide
undo across palette, typography and scale is a separate piece of work; the
history mechanism from stage 3 should be written so it can be reused there.

## Still open

- Whether `fg.disabled` and friends should keep their solid seeds and only
  new tokens use alpha, or whether the seed set moves onto alpha (stage 5
  recommends moving, measured to match).
- Whether the group sidebar also becomes the navigation for the docs
  semantic page, which would give the two the same shape.
