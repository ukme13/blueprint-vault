# Foundations documentation and the handover

## Goal

Turn what the studio produces into something a client's team can receive and
use. Today the workspace generates a whole system: a palette, a semantic layer
in two modes, a type system, spacing, radius and elevation, three export
formats and an accessibility report. What it cannot do is explain any of that
to the developer who installs the file, or to the designer who has to keep
using it after the project is handed over.

`apps/docs` is where that explanation belongs. It has one page, for Button,
and nothing about the foundations. This plan makes the docs app read the same
workspace the studio writes, render the foundations from that data, and pack
the result into a handover a client can keep.

## Why now

- Every foundation plan is complete: colour formats, colour-vision simulation,
  semantic tokens, typography, uploaded fonts, and the scale studio all have
  their stages ticked. There is nothing left to generate before there is
  something to explain.
- The README has listed "document the core foundations" as priority 2 since
  before the semantic layer existed. It has never started.
- The semantic plan left one question open: whether `/preview` is also the
  export target for a client-facing PDF or static handoff. That question is
  really about this plan, and it gets answered here.
- The first product application (`apps/ferre`) is priority 3. A product team
  that starts without foundation docs will re-learn the rules by reading
  `theme.css`, which is the failure the docs exist to prevent. This plan lands
  before that one.

## System model

**The docs app is the first client.** It does not import `theme.css` from
`packages/ui` the way the playground does. It installs the exported CSS file,
the same file a client's developer would install, generated at build time from
a workspace file checked into the repository. If the export is missing an
alias, or a shadow arrives as a literal, the docs app is the first thing to
break. This is the `/preview` rule again, one level out: the page that proves
the export is the page a client is shown.

**Pages are templates over data, not hand-written values.** A colour page does
not say "primary 500 is oklch(…)". It reads the workspace, renders every
track, every semantic token in both modes, and the contrast rows the report
already computes. Change the reference workspace and every page moves. A page
that copies a value is the same rot as a semantic token that copies a value.

**Guidance is content, and content is separate from data.** "Use `fg.secondary`
for supporting text, never for body copy" is written by a person and lives in
its own content module. Data changes with the workspace; guidance changes when
the rules change. Keeping them apart is what lets a client's workspace be
dropped in without rewriting the prose.

**Two readers, one page.** The designer wants when and why; the developer wants
the token name, the value in each mode and how to reference it. Each foundation
page carries both, in that order, so a page is never a swatch grid and never a
bare table.

## What exists today

**The formatters are done.** `formatDesignSystemCss`,
`formatDesignSystemTailwind` and `formatDesignSystemDesignTokens` emit every
layer in one file, with aliases intact. `formatBlueprintWorkspace` writes the
project file. `formatAccessibilityReportMarkdown` and `Json` write the report.
Nothing in this plan adds a format; it consumes them.

**The workspace store is one owner.** `packages/ui/src/workspace` reads and
writes the project, with file versions 1 to 5 migrated forward and storage as a parameter. The
docs app can load a workspace file through the same code the studio uses, with
no storage at all.

**`/preview` shows the system as a page.** Nav, hero, cards, form, footer,
drawn only from semantic tokens, proven by `primitive-usage.test.ts`. It is the
right thing to link from the docs, and the wrong thing to fold into them: it
answers "does the system hold together", not "what is each part for".

**The docs app is a scaffold.** Next 16, Astryx, one route at `/docs/button`,
Geist fonts, no tests, no Playwright, not in the CI e2e step. Its `globals.css`
will need the same import order the playground settled on.

**Gap: no reference workspace in the repo.** Every workspace lives in a
browser's localStorage. There is no checked-in project that CI, the docs app
or a test can read. Stage 1 creates one and it becomes the fixture everything
else in this plan reads.

**Gap: the scanner knows the playground, not the docs.** `primitive-usage.ts`
scans `apps/playground` against an allowlist. The docs app needs the same rule
with its own, shorter allowlist, or the "no hardcoded value" promise is only
half kept.

## Stages

1. ✅ **The reference workspace and the build-time export, no UI.** Check in
   `apps/docs/blueprint/reference.workspace.json`, a real project saved from
   the studio. Add a `prebuild` step that runs the three system formatters
   over it and writes `apps/docs/app/blueprint.css` and the Tailwind and DTCG
   siblings. A test regenerates and compares, so a formatter change that moves
   the output shows in the docs app's diff rather than in a client's inbox.
   The docs app imports the generated CSS for its tokens, not `theme.css`.

   Two facts found while checking this stage, and what they change. First,
   `theme.css` also carries the Astryx bridge, the `@scope
([data-astryx-theme])` block that maps Blueprint roles onto the variables
   Astryx components read, and the export does not. Without it every Astryx
   component in the docs app renders in theme-neutral's colours. The bridge
   moves into its own file, `packages/ui/src/astryx-bridge.css`, which
   `theme.css` imports so the playground is unchanged, and which the docs app
   imports beside the generated CSS. A client who uses Astryx gets the same
   file. Second, `formatDesignSystemCss` leaves typography out on purpose,
   because the unit is the client's choice. The docs app is a client and
   chooses `px`, so the prebuild writes a second file from
   `formatTypeSystemCssExport`.

2. ✅ **Colour.** One page for the primitive tracks and one for the semantic
   layer. The semantic page is the Semantics table from the studio, read-only:
   nineteen names down the side, light and dark across, the resolved swatch
   and the primitive it points at in each cell, and the contrast verdict the
   report already computes for each pair. Written guidance for each group:
   `fg`, `surface`, `border`, `action`, `status`, `focus`.

3. **Typography, then spacing, radius and elevation.** The same shape for each:
   the table the studio already knows how to draw, the specimens the studio
   already renders, and the guidance a person writes. Elevation shows every
   level on a light and a dark ground, which the playground already does and
   the allowlist already permits.

4. **The scanner, extended to the docs app.** `primitive-usage.ts` takes a
   root and an allowlist; the docs app's allowlist starts empty and each entry
   added must say why. This is the stage that keeps stages 2 and 3 honest. It
   lands after them rather than before so the allowlist is written from what
   the pages actually needed, not from what they might.

5. **The handover.** A new entry in the export dialog: one archive holding the
   CSS, Tailwind and DTCG files, the workspace file, the accessibility report,
   and a static, self-contained HTML build of the foundation pages for that
   workspace. That build is the docs app's pages rendered once against the
   exported workspace instead of the reference one. This answers the semantic
   plan's open question: the handover is static HTML, and `/preview` stays a
   live page that the static build links to. A PDF is a print stylesheet over
   the same HTML, later, if a client asks for one.

6. **Checks.** Playwright for the docs app, in the CI workflow beside the
   playground's. The e2e covers the pages rendering, the mode switch, and one
   value followed from the reference workspace to the rendered table, so a
   page that stops reading the data is caught.

Stage 1 lands with nothing consuming it, as the migration did in the semantic
plan, because everything after it reads that file. Stage 5 is last because it
is the only stage that touches the studio, and it should touch it once, when
the pages it bundles are finished.

## Not doing

- **MDX.** Guidance is short and structured, and a TypeScript content module
  gives it types and a lint. `@next/mdx` is a dependency and a build path to
  own; it earns its place when someone is writing long prose, not before.
- **Component documentation beyond Button.** The README rule stands: a shared
  component is added when a real product needs it. Ferre is where that
  pressure will come from.
- **A hosted docs site per client.** The handover is a file. Hosting is a
  product decision that belongs to the product plan.

## Safety and quality rules

**The docs app may not read `theme.css`.** Enforced by a test on its import
graph. The moment it does, it stops proving the export. The Astryx bridge is
the one file it shares with the studio, and only because the bridge is not a
token.

**A foundation page may not hardcode a value.** Enforced by the extended
scanner in stage 4, with a written reason for every allowlist entry.

**Generated files are committed and compared, not ignored.** A formatter
change must appear as a diff in `apps/docs`, reviewed like any other change.

**Guidance text names tokens, never values.** "Body text is `fg.primary` on
`surface.base`", not "body text is neutral 950 on neutral 50". A client who
retunes a track should not have to retune the prose.

**The static build is the same components.** No second set of templates for
the handover. If the docs page and the handover page can drift, they will.

## Definition of done

1. The docs app builds from a checked-in workspace and the exported CSS, with
   no import from `theme.css`.
2. Colour, semantic, typography, spacing, radius and elevation each have a
   page that renders from the workspace and carries written guidance.
3. Changing a value in the reference workspace changes every page that shows
   it, proven by a test.
4. No foundation page uses a hardcoded value, proven by the scanner.
5. The export dialog produces a handover archive with the three formats, the
   workspace, the report and the static foundation pages.
6. Playwright covers the docs app in CI.

## Decisions

Open, with a recommendation for each.

**Source of truth for the docs. Recommend: a checked-in workspace file, not
localStorage and not `theme.css`.** A file is what a client receives and what
CI can read. `theme.css` is the studio's own chrome and is not what a client
installs.

**Where the reference workspace lives. Recommend: `apps/docs/blueprint/`.**
It is the docs app's fixture. If a second app needs one, `packages/ui`
gains a `fixtures` folder then.

**Handover format. Recommend: static HTML in an archive, not PDF.** HTML keeps
the mode switch, the live contrast table and the copyable token names; a PDF
flattens all three. Print styling gives a PDF later for nothing.

**Guidance authoring. Recommend: TypeScript content modules, one per
foundation.** Typed, linted, and diffed like code. Revisit when the prose
outgrows it.

## Still open

- Whether the docs app should also render a client's workspace dropped in at
  runtime (import a file, read the docs against it), or stay build-time only.
  Runtime is what makes the docs a tool; build-time is what makes them a
  deliverable. Stage 5 gives the deliverable; the tool can follow if a client
  asks for it.
- Whether the Button page moves onto the same data-driven pattern now or waits
  for the component plan.

## Before this plan starts

Two pieces of housekeeping, so this plan starts from `main`:

1. **Close `feat/semantic-token-vocabulary`.** It is four commits ahead of
   `main` with one uncommitted change (`box-shadow: none` on the palette
   panel). Decide whether that change is intended, commit or revert it, run
   the full checks, write the journal entry, then merge.
2. **Fix the doc drift.** The README's "Current roadmap" still names
   colour-vision simulation as the next priority; `.agents/AGENTS.md`
   describes `apps/web` and Astryx 0.1.3. Point the agents file at
   `CLAUDE.md` rather than keeping a second copy that ages separately.

## Notes from stage 1

**The plan named the wrong file for a Tailwind client.** It said the docs app
imports the generated CSS, meaning `blueprint.css`. The docs app is a Tailwind
app and its pages are written in `text-neutral-600` and `bg-primary-500`, and
only the `@theme` block registers those as utilities — so the plain file would
have declared every variable and dropped every colour utility, silently, which
reads as a design change rather than a broken import. It imports
`blueprint.tailwind.css` instead. Both files still ship to a client, because
which one is right is a fact about the client's stack. The unit file and the
bridge join them, so the docs app installs four lines where the plan expected
two.

**The generated files sit outside Prettier.** They are formatter output
compared byte for byte against the formatters that produce them, and Prettier
rewriting them would put the committed copies permanently out of step — drift
arriving from the one direction nobody would think to look. The reference
workspace is ignored for the same reason: it is meant to be replaceable by a
file saved out of the studio, and neither writer formats JSON the way Prettier
does.

**The export does not carry everything the bridge feeds.** Twenty-two names,
in two kinds, now pinned by a test that fails when one of them is fixed.

Six are semantic roles the studio's own chrome has and the seeded layer does
not: `fg.accent`, `fg.on-action`, `action.muted`, `border.strong`,
`surface.skeleton`, `surface.track`. No workspace has them, so no client can
have them. Measured on the running docs app, `--color-on-accent` resolves to
nothing and the Astryx token quietly keeps theme-neutral's value; the home
page's eyebrow text and its section rules lose their colour the same way,
because `apps/docs/app/page.module.css` reaches for `--color-fg-accent` and
`--color-border-strong`. Left broken on purpose: the fix is a decision about
the seed set, not a name added by hand to one app.

The other sixteen are the `secondary` and `tertiary` primitive tracks. The
bridge maps Astryx's cyan and purple families onto them, `theme.css` defines
them, and a studio project has never had them — the six seeded tracks are
primary, neutral, success, warning, error and info. That gap is not the docs
app's; it is the bridge assuming a palette shape the studio does not produce.

**The docs app has no dark mode to check.** `layout.tsx` pins
`data-theme="light"` and its provider pins `mode="light"`, so the screenshots
are light for both routes. Forcing the attribute and `color-scheme` moves every
Astryx surface, which is what proves the dark half of the export and the bridge
resolve; the page chrome stays light because the pages are written in fixed
Tailwind utilities. Both are pre-existing and neither is stage 1's to fix.

**Running a script against `@blueprint/ui` needs a runner.** The package entry
is `.tsx`, so Node cannot load it under type stripping, and its internal
imports are extensionless, so pointing at the `.ts` files directly does not
work either. `tsx` runs the two scripts. Inside them the package has to be
reached with `createRequire`: it is CommonJS, apps/docs is ESM, and across that
edge Node lexes for named exports and cannot follow the `export *` chain from
the entry to the file a name lives in — `import { x }` fails to link and a
namespace import binds an object carrying only `default`.

**`turbo build` needs no new configuration.** `prebuild` fires under pnpm, so
`next build` cannot start without regenerating; the generated files and the
reference workspace are inside `apps/docs`, so `$TURBO_DEFAULT$` already treats
them as inputs. They are deliberately not declared as outputs: they are
committed, and an output would be restored from cache over the working tree.

## Notes from closing stage 1's findings

**The six roles are in the layer, and the gap list is empty.** `fg.accent`,
`fg.on-action`, `action.muted`, `border.strong`, `surface.skeleton` and
`surface.track` are seed roles now, so the layer is twenty-five and a workspace
saved before they existed gains them on read. Each is seeded to the primitive
the studio's chrome already resolves it to, in both modes, so nothing about the
studio moved: the docs app's eyebrow and its section rules came back through
the export with no token added by hand to that app.

**Mirroring could not produce those pairs, and that is a fact about the seed
rather than about these six.** Dark has always been seeded by mirroring the
index, which is right for a role that carries the page — text on light becomes
text on dark. It is wrong for a role whose two values were chosen as a pair:
`fg.on-action` is neutral 50 on the light fill and 950 on the dark one, and the
mirror of 50 is 900. Every one of the six was a shade out. A seed role can name
its dark weight now, falling back to the mirror when the track does not have
it, the same way `preferWeight` falls back to `position`.

**Which of the six the report measures, and why.**

`fg.on-action` is measured against `action.primary`. It is the only foreground
in the layer whose background is not a surface, and that pair is the one every
filled button ships. It joins the checks rather than replacing the sample above
it: that one asks what black or white would do on the fill, which is a
different question and still worth an answer.

`fg.accent` is measured on `surface.base`, like every other foreground. It is a
link, an eyebrow, the label on a selected tab — text, not a fill. `Primary
link` in the same list measures `action.primary` on the canvas, which was the
fill colour standing in for a text colour the layer did not have; that row is
left alone for now, but it is the one to revisit when stage 2 writes the colour
page.

`action.muted` is kept out of the similarity grid, by the rule already written
down for hover and active: it is the same accent turned down behind a selected
row, not a signal anybody reads beside a status badge. Six signalling tokens
and fifteen pairs, unchanged.

`border.strong`, `surface.skeleton` and `surface.track` are out of both. None
carries text and none signals by colour; they are non-text contrast, the 3:1
family the report already handles separately through `assessNonTextChecks`.
Adding rows for them means deciding what each is measured against — a border
against the surface it sits on, a track against the fill inside it — which is a
question the colour page should ask with the tokens in front of it rather than
one answered here in passing.

**A workspace file never migrated, and only a file reaches a client.**
`readWorkspaceProject` topped a stored layer up to the current seed set;
`readWorkspaceFileProject` read the layer and stopped. The same document had
two answers depending on which door it came through, and the docs app reads a
file — so it kept exporting nineteen roles while the studio had twenty-five.
The file path fills now, appending behind whatever the file chose.

**The bridge assumed two tracks that have never existed.** Astryx's cyan and
purple families were fed from `secondary` and `tertiary` primitives, which
theme.css defines and no saved project has ever had. Those sixteen declarations
are gone and Astryx keeps its own values. Worth recording what they were doing
in the studio, where the tracks do exist: theme.css defines both as
byte-identical copies of primary, hue 34.49 — so a Badge asking for purple was
rendering in the primary hue, and in dark mode as `tertiary-950`, near black.
The three purple badges in the palette studio now show theme-neutral's purple.
That is the one visible change, and it is the bridge no longer answering a
question it had no palette for.

**Sixty-four primitive references remain in the bridge, and they are the same
assumption in a quieter form.** The status and colour-family blocks name
`success`, `warning`, `error` and `primary` directly, and they work only
because the studio seeds tracks with those names — a client who calls theirs
`brand` and `grey` gets the same silent nothing cyan and purple were giving.
They cannot move to roles today: Astryx wants a background, a border, an icon
and a text colour per status, where the layer has one `status.success` and no
opinion about the tint behind it. That is a set of roles stage 2 should argue
for with the colour page in front of it. The count is pinned by a test so it
can only go down.

## Notes from stage 2

**What the two tables share is the rule, not the component.** The plan said
the documentation's semantic page is "the Semantics table from the studio,
read-only". Building it showed that sharing the component would mean a
read-only flag threaded through a table whose every cell is an input — two
tables in one file, pretending to be one. What genuinely was duplicated is
smaller and worth more: which group a token belongs to, what that group is
called, and what order the groups come in. That is `groupSemanticTokens` in
@blueprint/ui, and the studio's editor calls it now. `semanticRowGroups`,
`primitiveTrackRows` and `resolvedRoleReference` sit beside it, so a variable
name on a page is built by the function the CSS export uses rather than by a
second spelling of the same rule.

**Backticks in the guidance earn their keep twice.** The content module writes
role names in backticks, which is how the test finds them to check against the
seed set — and rendering the string raw put the backticks on the page. The
marker stays in the source and a four-line `Prose` component reads it. A
paragraph that wants more syntax than that is a paragraph that wants MDX, and
the plan's answer to that is still no.

**Vitest in an application, which the testing strategy does not ask for.**
Unit tests live in packages/ui and Playwright covers the apps. The exception
here is narrow and the reason is the rule being checked: a page is a template
over data, and the only way to know a template is a template is to render it
twice against different workspaces and watch the output move. That test has to
live where the components do. Both were watched failing with a hard-coded
swatch in place.

**The documentation was pinned light in two places**, `mode="light"` on its
provider and `data-theme="light"` on its root element — on a site describing a
system whose whole point is that a name carries two values. The mode is one
preference across both applications now, under the key the studio already
used, so a person moving between them keeps their choice.

**What the reference workspace does not have, and a real project would.**
Three things, all of them worth knowing before stage 5 hands one to a client.

Its stored layer is nineteen roles, seeded before the six chrome roles and the
twelve status parts existed; the pages render thirty-seven because
`fillSeedRoles` tops it up on read. That is the migration working, and it also
means the file on disk has not matched what the pages show since the day it
was written. Re-seeding it would fix the mismatch and lose the demonstration.

Its tracks carry no `adjustments`. A project somebody has actually worked on
has anchors and manual overrides — hand-tuned shades that the generator blends
around — and no page here has ever been rendered against one. The tables would
show them without knowing they were special, which is probably right and has
not been checked.

And a workspace has no colour format. The studio picks hex, OKLCH or RGB from
a per-device preference, so a handover file cannot say "this system is
documented in OKLCH" — the documentation had to choose hex on the client's
behalf, exactly as `generate-blueprint.ts` does for the export. If a client's
notation is part of their system rather than part of their browser, that is a
slice the workspace is missing.
