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

**Export keeps the alias.** CSS emits a mix toward transparent so the alias
survives: `--color-divider: color-mix(in oklab, var(--color-neutral-950) 12%,
transparent)`. Tailwind gets the same. DTCG emits the resolved value with the
alpha and records the reference and alpha in `$extensions`, because the DTCG
alias form has no alpha slot. The Astryx bridge is unchanged: it points at
roles. (The first draft of this line said relative colour syntax; see the
decision below for why it does not.)

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

1. ✅ **Alpha in the model, no UI.** The reference shape, the workspace file
   version and its migration (an absent alpha reads as opaque), resolution
   with alpha, compositing in the report and the similarity grid, and the
   three export formats with the alias preserved. Tests: a token at 12%
   resolves to the same colour in both modes with alpha; the report's row
   for a transparent foreground names the composited colour; every alias
   in the CSS export still resolves into the primitive output.

2. ✅ **Selection operations, no UI.** Pure functions in `packages/ui`:
   `deleteTokens`, `duplicateTokens` (new ids with a `-copy` suffix that
   never collides), `moveToGroup` (rename prefix, preserving order),
   `repointTokens` (one mode, one reference, many ids), and `usedBy` over
   the tone table, the bridge and the pair rule. A `removedSeedRoles` list
   in the slice that `fillSeedRoles` honours. Tests for each, including
   that a load-bearing role refuses deletion with the list of consumers.

3. ✅ **Undo.** A history of layers for the semantics slice with a bounded
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

## Notes from stage 1

**The workspace file went 5 → 6, and not because anything is missing.** Every
earlier bump added a slice that older files lacked and gained on read. A
version 5 file has no alpha anywhere, and absent already means opaque, so it
reads back unchanged and nothing is filled. The number moved for the other
direction: a build that knows only 5, handed a file with `alpha: 0.12`, would
read the reference, ignore the field it does not know and hand back a solid
divider — a silent change to somebody's system. Only a version it does not
recognise makes it refuse, and refusing is the honest failure.

**Compositing happens in sRGB, on the encoded values, and that was measured.**
`composite(fg, surface)` is source-over with no linearisation, because that is
what the compositor does and therefore the only answer true of the screen. In
Chromium 151, a canvas in the default `srgb` colour space filled white and then
covered with `rgba(0,0,0,0.5)` reads back `127,127,127`; at `0.12` it reads
`224`. Linear-light would give `#bcbcbc` for the first, and interpolating in
OKLab — the space the palette is _generated_ in — would give roughly `#777777`.
Both would describe a page no browser renders. The function rounds where the
compositor truncates, so a channel can land one step of 255 apart; a ratio moves
in the fourth decimal.

**One composite, in one place, per measuring path.** `previewShadesFor`
composites each token over the mode's page ground before handing the map on, so
the text checks, the non-text checks, the focus check and the similarity grid
all measure what the eye receives without any of them knowing about alpha.
`assessSemanticContrast` composites per pair instead, because a foreground's
answer depends on which surface it is being measured against — which is exactly
the fact the report is for.

**The ground rule needs no special case.** A transparent surface composites over
`surface.base`; `surface.base` composites over itself, because there is nothing
in the system behind the page canvas. Compositing a colour over itself returns
it unchanged, so the rule falls out rather than being written.

**An out-of-range alpha is kept, not corrected.** The reader stores `1.4` as
`1.4`; the resolver clamps it and reports `missing: "alpha"` beside `"track"`
and `"weight"`. That let the studio's badge say the wrong thing under the right
mechanism — it was a ternary, so a new fault arrived labelled "weight gone" —
and it is a map now. Two faults on one reference report the larger: a gone track
means the colour is not the one anybody chose, an alpha a tenth out of range
means it very nearly is.

**Repointing dropped the alpha, and would have from the first edit.** The
editor rebuilt the reference from its two selectors, so changing a shade on a
transparent token would have quietly made it solid. Fixed here rather than in
stage 5, because the field exists now.

**Nothing in `apps/docs/app/blueprint/` moved.** No token has an alpha yet, and
every formatter's opaque branch emits the characters it emitted before — no
`$extensions` key on an opaque Design Tokens entry, no mix around an opaque
alias. Regenerated and diffed to prove it.

## Notes from stage 2

**Seventy of the seventy-two seed roles are load-bearing.** This was written
expecting a handful, and it is the finding that matters most for stage 4. The
seed set was not designed and then consumed — it grew out of its consumers, one
role at a time: seven button tones of eight roles each, thirty-four names the
Astryx bridge feeds into Astryx's own tokens, fifteen the palette preview
measures. A role nothing reads is the exception. Only `border.subtle` and
`border.muted` have no consumer, and they are what make the removed-seed list
reachable at all.

So the `usedBy` badge is not an edge case in the editor. It is what almost
every row will show, and "you cannot delete this" would be a table where
nothing can be deleted. The list of names in plain words, and the repoint that
is always available instead, are the whole difference between a rule and a
wall.

**Reading a role is not declaring one.** `theme.css` declares all seventy-two
so the studio's chrome has them whatever a workspace holds. Counting those as
consumers would have made every seeded role undeletable and the feature
pointless. Only the two it genuinely reaches for through `var()` —
`action.primary-active` and `surface.raised` — are counted. That distinction is
the one judgement in `usedBy` and it is worth knowing about before stage 4.

**Two of the five consumer lists cannot be read at runtime.** `usedBy` is
bundled for a browser and `node:fs` is not, so the bridge's thirty-four names
and the chrome's two are constants. A test reads the same files the bridge
guard reads and fails with the exact list to paste — the arrangement the docs
export guard already uses. The Button tones need no copy: the table holds
`var(--color-…)` strings, so they are parsed back out of it and a seventh tone
is picked up without anybody editing `role-consumers.ts`.

**Version 7 is a stronger case for a bump than version 6 was.** An alpha a
version-6 reader drops changes a colour. A `removedSeedRoles` list a
version-6 reader drops makes `fillSeedRoles` put the role back — silently
reversing an edit somebody made, in the one direction the reader was built to
be helpful in. Both readers, file and storage, were wired in the same commit,
because the semantic top-up itself once shipped with only one of them and the
same document gave two answers depending on which door it came in.

**The removed list is reconciled against the layer, not against the
operation.** There are more ways back in than there are operations — a
duplicate renamed onto the id, a token added by hand, an imported file that has
it — and all of them look the same from the layer: the id is present now. What
is _not_ inferred is the removal itself. Inferring "a seed role left the layer,
so it was deleted" is tidier and wrong on one path that matters: an import
replaces the layer wholesale, and every seed role the incoming document happens
not to have would be recorded as something this user threw away. So a deletion
says so explicitly, through `withSemanticsSlice`'s `justRemoved`.

**Nothing calls that parameter yet, deliberately.** The editor's own delete is
stage 4's, so deleting a seed role in the studio today behaves exactly as it
did before this list existed. That is the "no UI" of a model stage rather than
an oversight, and it is the one thing stage 4 must not forget to wire.

**Two component files were touched, both for types rather than behaviour.**
`PaletteStudio.tsx`'s `ForeignSlices` is `Omit<WorkspaceProject, …>`, so a new
field on the workspace is a compile error there by design — `removedSeedRoles`
joins `semantics` in the exclusion list, because it belongs to the slice that
studio owns. And stage 1's `SemanticEditor` badge map gained nothing new. No
component gained a call to a stage 2 function.

## Notes from stage 3

**The history holds whole values, not reversed actions.** Every edit in this
studio is already a pure `T -> T`, so keeping the value before it is cheaper to
write and impossible to get wrong. An inverse-action history has to derive an
undo for every operation, and a single missing inverse is a corruption nobody
notices until it is saved.

**A step is the layer _and_ the removed-seed list.** This is the one thing that
would have shipped broken. A history holding `SemanticToken[]` alone restores a
deleted seed role, leaves its id on the removed list, and the next read takes it
straight back out — an undo that works on screen and is gone after a reload. The
snapshot type exists for that reason and for no other.

The corollary is that `workspaceWithSnapshot` writes the list as recorded rather
than reconciling it. `withSemanticsSlice` reconciles because a _new_ edit has to;
an undo is restoring a pair that was already consistent when it was taken, and
reconciling would drop the removal the moment its token came back — which is
precisely the step being undone.

**Coalescing is keyed, not flagged.** A boolean "this continues the previous
edit" is true of the fourth keystroke in a cell and equally true of the first
keystroke in the _next_ cell, so it folds two renames into one undo. A key —
`rename:surface.raised` — says _which_ edit, coalesces with itself and not with
its neighbour, and ends an edit when focus moves without the editor having to
announce it. Anything unkeyed, and any undo, redo or sync, closes the open edit,
so a keystroke cannot reach back across a delete that happened between two of
them.

**Fifty steps.** Each is a whole slice of seventy-two tokens — roughly 15 kB of
plain objects — so fifty is about three quarters of a megabyte held for as long
as the tab is open, which is nothing beside what the palette itself costs. It is
chosen to be past the point anybody keeps counting: a designer who has made
fifty edits has stopped thinking of them as a sequence. The bound trims the
oldest rather than refusing new steps, because an editor that silently stopped
being undoable once its history filled would do so at the worst possible moment.

**A reconcile is not a step, and neither is the first read.** Undo means "take
back what I did". Undoing a write another tab made would throw their work away
with nothing to distinguish it from an ordinary undo, and recording the layer as
it was found would let somebody undo the act of opening the studio. Both go
through `sync`, which moves the present and leaves the past and the future
alone.

Worth knowing for stage 4: there is no `storage` event listener anywhere in this
studio today. Cross-tab safety comes from `updateStoredWorkspace` re-reading
before every write, and `useWorkspaceStore.reload` exists for a tab that has
learnt storage changed — with nothing calling it. So `sync` is currently only
the first read. The rule is in place and tested; the second caller does not
exist yet.

**No keyboard here.** `useSemanticsHistory` returns `undo` and `redo` for stage 4
to bind Ctrl+Z and Ctrl+Shift+Z to in one line. A shortcut belongs to the
component that owns the focus it applies to, which is the table that does not
exist yet.

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

**How alpha is exported. Settled in stage 1: `color-mix(in oklab, var(--x) 12%,
transparent)`.** The recommendation was relative colour syntax. The floor says
no.

_The floor._ This workspace declares no `browserslist` of its own, so the floor
it inherits is Astryx's. `astryx docs browser-support` does not state one
number — it defines tiers, and says "Astryx officially supports Tier 1 and
Tier 2". That makes **Tier 2** the floor: Chrome 114+, Edge 114+, Safari 17+,
Firefox 125+ (Baseline − 2 years, 2024). Tier 1 is Chrome 125+, Edge 125+,
Safari 26+, Firefox 147+.

_The evidence._ MDN's browser compatibility data, fetched from
`bcd.developer.mozilla.org/bcd/api/v0/current/css.types.color.oklch.json`
(BCD 8.0.14, snapshot 2026-09-03), key `relative_syntax`, described there as
"Relative Oklch colors", beside the same data for `color-mix()` from
`css.types.color.color-mix.json`:

|                        | Chrome | Edge | Firefox | Safari | Samsung |
| ---------------------- | ------ | ---- | ------- | ------ | ------- |
| Relative Oklch colours | 122    | 122  | 128     | 18     | 26.0    |
| `color-mix()`          | 111    | 111  | 113     | 16.2   | 22.0    |
| Tier 2 floor           | 114    | 114  | 125     | 17     | —       |

Relative colour syntax is outside the floor on all three engines: Chrome by
eight versions, Firefox by three, Safari by a whole major. `color-mix()` is
inside it on all three, and Astryx's own document lists `color-mix()` among the
features that have "been widely available since 2023 or earlier" and need "no
special handling".

_The recommendation's objection does not survive measurement._ It says
`color-mix` "mixes toward transparent through a colour space the client did not
choose". Measured in Chromium 151.0.7922.34,
`color-mix(in oklab, rgb(234 88 12) 40%, transparent)` computes to
`oklab(0.646079 0.146426 0.127797 / 0.4)` — the colour's own coordinates,
untouched, with the alpha applied. Mixing with `transparent` premultiplies, so
the interpolation space decides how the value is written and not what colour
comes out. MDN, on `color-mix()`: "the `color-mix()` function can be used to add
transparency to any color". The alias survives either way; only the spelling
differs, and one of the two spellings renders for everybody inside the floor.

_Revisit when_ the floor moves up to Baseline 2026, where relative colour syntax
is inside on every engine. It is the better spelling. It is not yet the safe
one.

**Which space compositing happens in. Settled in stage 1: sRGB, on the encoded
values.** Not linear-light, which is the physically correct blend and is not
what a compositor does; not OKLab, which is where this palette is generated and
would be right for a gradient. Measured, not assumed — see "Notes from stage 1".

**How the reference and alpha are recorded in Design Tokens. Settled in stage 1:
`$extensions`, under `co.designally.blueprint`.** The format's alias form has no
alpha slot, so a transparent token emits the resolved eight-digit value (the
spelling the shadow export already uses) and puts the reference and the alpha
where the specification puts vendor data: "The keys SHOULD be chosen such that
they avoid the likelihood of a naming clash with another vendor's data. The
reverse domain name notation is recommended for this purpose." Tools that do not
understand the key MUST preserve it, so the alias survives a pipeline that has
never heard of this studio.

_Open, and worth one minute of somebody's attention:_ this repository declares
no domain anywhere — no `homepage`, no `repository`, no organisation name — so
the key was taken from the account this work is done under. If the published
domain is something else, this constant is the one place to change it.

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
- **Removing a whole tone.** A client with no `info` status wants those
  eight roles gone, and today they cannot go: `usedBy` refuses each one
  because `BUTTON_TONES` names them, and it is code. Deleting a tone means
  the Button's scheme list becoming workspace data — which tones exist is a
  property of the system rather than of the component library. That is a
  plan of its own, not this one; stage 2 measured the shape of the problem
  (seventy of seventy-two seed roles are load-bearing, and fifty-six of them
  are load-bearing because of that one table) and stops there.
