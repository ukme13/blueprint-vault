# Semantic colour tokens, and a page that proves them

## Goal

Add a semantic layer over the primitive palette, and one demo page that is
allowed to use semantic tokens only — so the page discovers what the layer is
missing, and then becomes the thing a client is shown.

Today the workspace exports `--color-primary-500`. That says what a colour is
and never says when to use it. A client's developer codes against
`--color-text-primary` and `--color-surface-raised`, not against a shade number.

This does not replace the primitives. The primitive palette stays exactly as it
is; semantics are a layer of names pointing into it.

## System model

A semantic token is **a name plus one reference per mode**:

```
text.primary   light -> neutral.950   dark -> neutral.50
surface.base   light -> neutral.50    dark -> neutral.950
action.primary light -> primary.500   dark -> primary.400
```

Three properties follow from that shape, and all three are the point of the
layer:

**A reference, not a copy.** The semantic token stores `neutral.950`, never
`oklch(5% …)`. Change the primitive and every semantic pointing at it moves.
A layer that copies values rots the first time somebody edits a track, and rots
silently, which is worse.

**One name, many modes.** This is what makes dark mode possible at all. There is
no mode concept anywhere in the exported system today, and retrofitting one
later is the expensive version of this work.

**Resolution happens last.** `resolveSemantic(token, mode)` returns a hex for
preview, contrast and export. Nothing upstream of that call knows about modes.

The model belongs in `packages/ui/src/color/semantic.ts`, beside `palette.ts`
and `preview-assessment.ts`, per the architecture rule — it is a pure
transformation and the app only binds it to React state.

## What exists today

Five things to build on, and four gaps worth knowing before starting.

**The semantic layer already exists. It is hard-coded and invisible.**
`PreviewShades` in `preview-assessment.ts` is eleven semantic roles by another
name:

```
primaryAction  primarySoft  primaryFocus  secondaryAction
neutralLight   neutralMid   neutralDark
successAction  warningAction  errorAction  infoAction
```

Somebody already decided which shade a component reaches for. That decision is
locked inside a preview helper, cannot be edited, and is never exported. **The
work is not inventing a semantic layer — it is making the one already in use
explicit, editable and exportable.** Those eleven are the seed set, and they
are the honest answer to "how many names should we ship", because they are the
names this workspace has needed in practice.

**Track names are semantic-shaped but are still primitives.** The default tracks
are `primary`, `secondary`, `neutral`, `success`, `warning`, `error`, `info`. A
developer reading `--color-success-500` learns the track's intent but not
whether it is the badge fill, its text, or its border. Track names describe a
family; semantic tokens describe a use.

**The pair checks already run on semantic roles.** `SEMANTIC_PAIRS` compares
success/warning, success/error, warning/error and primary/info at each track's
_action_ shade — and the file says why: those are "the pairs a component
actually puts together". Once semantics are real data, that list should be
derived from them rather than hard-coded a second time.

**Preview templates exist.** `apps/playground/components/typography/preview-templates.tsx`
has `article`, `card` and `marketing`. They are typography-only and live in the
app. The demo page is the generalisation of these, not a fresh start.

**The export dialog already has a format switch** — CSS, Tailwind, Design
Tokens, Blueprint Workspace, plus the report as Markdown and JSON. Semantic
output is entries beside those rather than new UI.

**Gap: the workspace file rejects any version but 1.** `workspace-file.ts:79`
tests `parsed.version !== BLUEPRINT_WORKSPACE_FILE_VERSION` and refuses
anything else. Adding semantics means version 2 plus a migration, or every file
a user has already saved stops opening. This is why the migration is its own
stage and lands before anything writes a semantic token.

**Gap: the export guard will refuse the new formatters.** The guard in
`packages/ui/src/fonts/export-guard.test.ts` discovers every exported `format*`
and fails until each is classified. By design — expect it rather than be
surprised by it.

**Gap: there is no mode anywhere in the system this produces.**
`apps/playground/app/globals.css` and `layout.tsx` style the studio's own
chrome. Nothing in `theme.css` or any export has a light or dark variant.

**Gap: `theme.css` is 454 lines and every token is a colour.** No spacing, no
radius, no shadow. Worth knowing because it bounds this plan: semantics here
means semantic _colour_. The same alias machinery should later carry spacing and
radius, and stage 1 should not make that harder, but it is not this plan.

## First version

The first useful version should let somebody:

- See the eleven seeded semantic tokens, each pointing at a primitive shade.
- Change what a semantic token points at, per mode, and watch every preview
  follow.
- Switch the whole workspace between light and dark.
- Open a demo page — nav, hero, cards, a form, a footer — drawn only from
  semantic tokens, in either mode, under any colour-vision simulation.
- Export semantics as CSS custom properties, Tailwind theme entries, and DTCG
  tokens with aliases intact.
- Read a contrast report about the pairs that actually ship.

## Stages

1. ✅ **The model, no UI.** `semantic.ts`: the token shape, the seed set taken from
   `PreviewShades`, `resolveSemantic(token, mode)`, and the rules for a
   reference that no longer exists. A missing reference is a normal state — the
   same call the uploaded-fonts plan made about a missing font file — because a
   user can delete a track a semantic points at. It resolves to a stated
   fallback and is reported, never thrown.

2. ✅ **Workspace version 2 and its migration.** Before anything writes a semantic
   token, because of the strict version check above. A version 1 file loads and
   gains the seeded defaults, so an existing project opens with a complete
   semantic layer it never had.

3. ✅ **The editor.** Assign a primitive to each semantic name, per mode, with the
   resolved swatch shown beside the reference. Add and rename tokens. This is
   where the "alias not copy" rule becomes visible: editing a track must move
   every semantic pointing at it, on screen, without a reload.

4. ✅ **The demo page, semantics only.** A realistic page rather than a swatch
   grid, with a mode toggle, and the vision simulation from the palette studio
   applied over it. The rule that makes it worth building: **the page may not
   reference a primitive token.** Every place it is forced to, name the missing
   semantic and add it. The rule is a test, not an intention — see below.

5. ✅ **Export and report move onto semantics.** CSS emits
   `--color-text-primary: var(--color-neutral-950)` so the alias survives into
   the client's stylesheet. DTCG emits `{palette.neutral.950}`. The contrast
   report stops reporting arbitrary pairs and reports the pairs the semantic
   layer defines, in both modes.

Stage 2 carries the risk of breaking saved work and lands with nothing
consuming it. Stage 4 is what tells you whether stage 1's seed set was right,
so it is worth doing before stage 5 fixes the export shape around it.

### Notes from the stages

**The names changed after stage 4, which is what stage 4 was for.** The first
pass translated `selectPreviewShades`' own labels — `neutral.light`,
`neutral.dark`, `primary.soft` — which say where on a ramp a colour sits.
Building a page from them showed what they were for, so they became
`surface.base`, `text.primary`, `surface.raised`, and `migrateSemanticIds`
carries a stored layer forward. `text.secondary` was added at the same time:
the page had been faking muted text with `opacity`, which the primitive check
cannot see and which mixes whatever is behind the element into a shade nobody
chose. Twelve tokens, not eleven.

**An export carries both layers.** A semantic file on its own is a set of
references to variables nothing declares, and a browser drops those in silence.
`formatColourSystemCss` and its two siblings emit the primitives and the
semantics together, so a client installs one file rather than remembering two.

**The alias is built from the same rule the primitive export uses.**
`paletteTokenName` is shared rather than reimplemented: a second copy would
point at a variable that does not exist the first time the two disagreed. A
test follows every alias into the primitive output and fails on any that does
not resolve.

**Dark mode needs three CSS blocks, not two.** `:root` for light, the media
query guarded by `:not([data-theme="light"])` for a system preference, and
`[data-theme="dark"]` last for an explicit choice. Only the media query leaves
a theme switch impossible; only the attribute ignores the system setting until
somebody clicks.

**The report's pairs come from a rule, not a list.** `surface.*` is a
background, `text.*` is held to the text threshold, everything else to the
non-text one — so a layer somebody has renamed or extended still reports
something. The cost is that it follows a convention: rename `surface.base` and
the pair leaves the report rather than being silently wrong. Every foreground
is measured against _every_ surface, because text that clears the page canvas
can fail on a raised card.

**The e2e that was meant to prove "alias, not copy" did not.** Switching tabs
unmounts the editor, so a value frozen in component state is refreshed on
remount and the test passed against a deliberately broken build. The model's
unit test does catch a real copying implementation; the e2e asserts instead
that what reaches storage is a reference and nothing else.

**Both hand-written lists are gone.** `selectPreviewShades` held its own copy of
the roles and `SEMANTIC_PAIRS` named four pairs, kept honest by a cross-check
test. `previewShadesFor` resolves the layer instead, keyed by token id, and the
pairs are derived by a rule: every two tokens in the groups that signal by
colour — `status` and `action`. The rule found five pairs the list had missed,
including `status.success` against `status.info`, which is green against blue
and exactly what tritanopia brings together.

## Later improvements

- Component-level tokens (`button.primary.background`) layered over these.
- Further modes: high contrast, or a second brand theme in one workspace.
- Spacing, radius and elevation reusing the same alias machinery.
- Per-mode contrast verdicts in the accessibility report.

## Safety and quality rules

**A semantic token stores a reference and never a value.** A test must change a
primitive and assert every semantic pointing at it resolves differently. If that
test can pass with a copied value, the layer is already broken.

**The demo page may not use a primitive token.** Enforced by a test that scans
the page's own styles for a primitive token name and fails on any hit. Without
this the rule lasts until the first hurried commit, and the page goes back to
being a nice picture that proves nothing.

**Export emits aliases where the format allows.** A client who changes one
primitive should see their whole system move. Flattening to resolved hex values
at export throws away the reason the layer exists.

**Contrast results must still name the primitives.** "text.primary on
surface.base fails" is not actionable on its own; the report has to say which
shades those resolved to, and in which mode.

**Simulation still never changes token values.** The existing rule carries over
unchanged: simulate at render, export the real palette.

## Definition of done

1. Eleven semantic tokens ship by default, seeded from the roles already in use.
2. A token can be repointed per mode, and every preview follows without reload.
3. The workspace switches between light and dark.
4. A version 1 workspace file opens and gains the defaults.
5. The demo page renders in both modes, under any simulation, using no
   primitive token — proven by a test, not by inspection.
6. CSS, Tailwind and DTCG exports carry semantics with aliases intact.
7. The report covers the semantic pairs in both modes.

Unit tests cover resolution, the missing reference, the migration and all three
formatters. Playwright covers repointing a token, the mode toggle, and the
demo page's primitive-free rule.

## Decisions

Open, with a recommendation for each.

**How many names to ship. Recommend: the eleven already in `PreviewShades`.**
Not a taxonomy invented up front. They are what this workspace has actually
needed, and stage 4 is the mechanism for arguing the set bigger. A semantic
layer designed in the abstract grows names nobody uses and misses the ones
everybody does.

**Dark mode now or later. Recommend: now, in stage 1.** Not because dark mode is
wanted today, but because holding a different value per mode is a semantic
token's entire job. Adding modes afterwards means revisiting the model, the
storage shape, the migration, the editor, every export and every contrast check.

**Where semantics live in the workspace. Recommend: their own slice, beside
palette and typography.** The workspace merge established slice-only writes;
semantics reference the palette but are not part of it, and a user may keep
their palette while replacing the semantic layer wholesale.

**Whether the demo page is a new route. Recommend: a new route, `/preview`.**
The typography templates stay where they are and keep their job — showing one
type scale. This page shows the whole system, needs both slices, and is the
artifact a client is shown. Folding it into either studio would make it answer
to that studio's toolbar.

## Still open

- Whether the demo page is also the export target for a client-facing PDF or
  static handoff, or stays a live preview only.

## Notes from the vocabulary rework

**One vocabulary, two sources.** The studio's own chrome in `theme.css` and
the layer the workspace exports had grown separate names for the same roles —
`--color-bg-surface` in one, `--color-surface-raised` in the other, and
`-base` suffixes where the first had to dodge Astryx. They now share one set
of names: `fg.*`, `surface.*`, `border.*`, `action.*`, `status.*`,
`focus.ring`. `theme.css` defines them for the studio from a neutral ramp that
has to render before any palette exists; the workspace exports the same names
for a client and overrides them inline on `/preview`. A developer reads one
name whether they are looking at the studio or at the file it produced.

**The names have to dodge Astryx, and that is measured, not inferred.** Astryx
defines `--color-border`, `--color-accent`, `--color-on-accent`,
`--color-skeleton` and every `text-*` / `background-*` inside its own theme
layer, scoped to the theme element. Our `@theme` block lands in Tailwind's
lower `theme` layer at `:root`, so a token of ours with one of those exact
names loses — and the bridge line that re-asserts it becomes
`--color-border: var(--color-border)`. Hence no bare `border`, `strong` rather
than `emphasized`, and `action` rather than `accent`. The bridge test reads
the resolved `--color-border` on the element Astryx scopes to and compares it
to ours; it fails when the mapping is broken and passes when it is restored.

**`text` became `fg`.** The same token colours icons and rules; "text" named
one use. `migrateSemanticIds` now follows a chain — `neutral.dark` →
`text.primary` → `fg.primary` — so a layer saved under the very first names
still lands on a name the seed set has, and the contrast rule keys on `fg`
for the text threshold.

**Seven roles were added, and existing workspaces gain them on read.**
`action.hover`, `action.active`, `surface.subtle`, `surface.overlay`,
`border.subtle`, `border.muted`, `fg.disabled`. `fillSeedRoles` appends
whatever seed role a stored layer lacks, seeded against that palette exactly
as a fresh layer would be, and never touches an empty layer — an empty layer
somebody stored is a deliberate act. Nineteen tokens, not twelve.

**Hover and active are states, not signals.** Deriving the report's pairs from
every `status`/`action` token would have paired `action.hover` against
`status.info` — a row that measures nothing anyone sees. `semanticPairIds`
keeps the two states out of the grid; they are still tokens with a foreground
on them, and the surface checks cover that. Fifteen pairs, as before.

**Opacity modifiers were already working.** `color-mix` takes a `light-dark()`
colour as it takes any other, so `bg-surface-raised/50` lands as alpha 0.5 in
both modes. Nothing changed for that; a test now pins it so nothing can.

**Foregrounds are solid on purpose.** A text state expressed as an opacity
lets the surface bleed through into a colour nobody chose and nothing
measured. `fg.disabled` is one value and is checked once.

**What governs the mode is a StyleX class, not an attribute.** Flipping
`html[data-theme]` flips `color-scheme` on the theme host and every token
read there — the tokens test proves it — and the studio's controls stay dark
anyway. `<Theme mode>` renders an inner element carrying `.xntwwlm
{ color-scheme: dark }`, chosen by React from the `mode` prop, and every
`light-dark()` beneath it resolves against that. Setting `data-theme` on that
element does nothing; only `setMode` changes the class. The studio-wide
toggle therefore goes through `ThemeProvider`, which is what the mode state
was scaffolded for. Found by screenshotting light mode and seeing dark.
