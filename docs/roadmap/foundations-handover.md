# Foundations documentation and the handover

## Done

Closed on 2026-09-06, across pull requests #91 to #105.

The documentation application reads a checked-in workspace, installs the same
export a client installs, and renders six foundation pages from it. A handover
is one archive: the stylesheets, the workspace, the accessibility report, a
README, and the pages built statically against whichever workspace file the
command is pointed at. Two scanners hold the pages to tokens, and Playwright
covers both applications in CI.

The definition of done is walked item by item below, with where each is proven.
One of the six is met differently from how it was written; that is said there
rather than ticked.

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

3. ✅ **Typography, spacing, radius and elevation.** The same shape for each:
   the table the studio already knows how to draw, the specimens the studio
   already renders, and the guidance a person writes. Elevation shows every
   level on a light and a dark ground, which the playground already does and
   the allowlist already permits.

4. ✅ **The scanner, extended to the docs app.** `primitive-usage.ts` takes a
   root and an allowlist; the docs app's allowlist starts empty and each entry
   added must say why. This is the stage that keeps stages 2 and 3 honest. It
   lands after them rather than before so the allowlist is written from what
   the pages actually needed, not from what they might.

5. ✅ **The handover.** A new entry in the export dialog: one archive holding the
   CSS, Tailwind and DTCG files, the workspace file, the accessibility report,
   and a static, self-contained HTML build of the foundation pages for that
   workspace. That build is the docs app's pages rendered once against the
   exported workspace instead of the reference one. This answers the semantic
   plan's open question: the handover is static HTML, and `/preview` stays a
   live page that the static build links to. A PDF is a print stylesheet over
   the same HTML, later, if a client asks for one.

6. ✅ **Checks.** Playwright for the docs app, in the CI workflow beside the
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

1. ✅ **The docs app builds from a checked-in workspace and the exported CSS,
   with no import from `theme.css`.** Proven by
   `system/docs-export.test.ts` — "are what the reference workspace generates
   today" regenerates the committed files and compares them, and "is the
   generated export, never the studio's theme.css" scans the app's import
   graph. #93.

2. ✅ **Colour, semantic, typography, spacing, radius and elevation each have a
   page that renders from the workspace and carries written guidance.** Six
   routes under `/foundations`, with guidance in `content/colour.ts`,
   `content/typography.ts` and `content/scale.ts`. The guidance tests —
   "names only roles a workspace actually has" and its typography and scale
   siblings — keep the prose from naming a token nothing defines. #93, #100,
   #101.

3. ✅ **Changing a value in the reference workspace changes every page that
   shows it, proven by a test.** `components/foundation-pages.test.tsx`, one
   describe per page: "the colour page's table is a template over the
   workspace" and its five siblings, each rendering twice with one value
   changed. Every one was watched failing against a hardcoded value. Proven
   again end to end by `e2e/workspace-values.spec.ts`, which follows a value
   from the JSON to the built page. #93, #100, #101, #105.

4. ✅ **No foundation page uses a hardcoded value, proven by the scanner.**
   `components/no-hardcoded-values.test.ts`, four checks — primitive shades and
   literal colours, measurements, radii, typefaces — over the whole app with an
   **empty allowlist**. Watched failing with `bg-neutral-100` on the home page.
   #102.

5. ⚠️ **The export dialog produces a handover archive with the three formats,
   the workspace, the report and the static foundation pages.** Met in two
   halves rather than one, deliberately. The dialog's Handover (.zip) carries
   the three formats, the typography stylesheet, the workspace, both reports
   and a README — eight files, proven by
   `e2e/handover-archive.spec.ts`, which unzips the download and compares it
   with `buildHandoverFiles`. It does **not** carry the pages: those are a Next
   build, and a browser cannot run one. `pnpm handover` produces the whole
   archive, 118 entries with 110 of them pages, proven by
   `scripts/verify-handover.ts` opening it over `file://`. The line above was
   written before that constraint was understood; the split is recorded in the
   stage 5 notes and is the better arrangement, but it is not what this item
   says. #104.

6. ✅ **Playwright covers the docs app in CI.** `apps/docs/playwright.config.ts`
   and twenty-nine tests in `apps/docs/e2e`, run by the `Playwright e2e (docs)`
   job on its own paths filter. The handover archive has a job of its own on
   merges to main. #105.

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

- ~~Whether the docs app should also render a client's workspace dropped in at
  runtime.~~ **Settled in stage 5: build-time, with a parameter.**
  `BLUEPRINT_WORKSPACE` names the file and `pnpm handover` points it at a
  client's, so one build documents any system. Runtime would make the
  documentation a tool and build-time makes it a deliverable — a folder a
  client keeps that needs nothing running — and a deliverable is what this plan
  was for. The tool can still follow if a client asks; nothing here forecloses
  it.
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

## Notes from stage 3, typography

**The reference workspace stores every role at 16px.** Eight roles, eight
different step offsets, all with `desktop.fontSizePx: 16`. The studio resolves
the offset against the ramp on read and never writes the result back, so the
stored number has been meaningless since the model merge. A page printing
`role.desktop.fontSizePx` would have shown eight roles at one size and called
it a scale, and nothing anywhere would have said otherwise. `resolveSystemRoles`
is that resolution lifted out of the studio's `useMemo` and into the package,
which is where the row builder reads it.

**The plan named five default groups and there are three.** "Display, heading,
body, label and caption" is the group table from the typography rework, not what
`defaultSystem` builds — it builds Display, H and Body. Supporting roles are
real and worth having; they are something a project adds, not something it is
given. The guidance covers the three that exist, and a test checks its role and
group names against the seed system so the prose cannot quietly describe an
intention again.

**The preview templates ask for roles no default workspace has, and this page
makes it visible.** `ArticleTemplate` asks for `label`, `title`, `heading`,
`body` and `display` — the six names from before the merge. A default system
has `display-1`, `h1`–`h6` and `body`, so four of the five fall through
`styleForRole` to body, and the article renders its kicker, its standfirst, its
byline and both section headings at 16px. The fallback is doing exactly what it
was designed to do, and what it is hiding is that the templates and the model
have been out of step since the merge. Not fixed here: the same fallback runs
in the studio, and changing it is a studio change. It is the first thing to
look at if the handover in stage 5 is meant to show a scale doing a job.

**Astryx's table guidance cannot be followed from a server component.** Its
"set an explicit width on every column with `proportional()` or `pixel()`"
lives in the data-driven mode, whose `columns` array carries a `renderCell`
function — and a function cannot cross into a client component. It fails the
build rather than degrading, which is the good kind of failure. Composed rows
are the only option, and there the cell sets `overflow-x: hidden` on an
auto-layout table, so a long `nowrap` variable name is clipped with no scroll:
measured, three names cut at 1280px and eleven at 900px. The names wrap now. A
wrapped name is ugly and complete; a clipped one is tidy and wrong, and it is
the tidy one somebody copies.

**A specimen rendered as its real element lands in the page's own outline.**
The plan asked for each role rendered as the element it maps to, which is
right — an `h2` role has to be an `h2` or the page is describing something it
is not showing. But seven roles rendered as h1 through h6 give a reader
navigating by heading eight top-level headings, six of them the words "Build a
stable type scale". The tag stays and `aria-level` moves the announced level
under the section, which is the distinction that was actually wanted: a sample
of a heading, not a heading of this document.

**The preview templates moved into the package and lost their `"use client"`.**
Not for tidiness — the directive makes the whole module a client boundary, and
a server component cannot call a function exported from one, nor pass
`styleFor` across it. They are constants and pure JSX, so the directive was
only ever there because the file lived in the studio's tree.

**Both fonts in the reference workspace are the same system family.** Two
entries, Display and Main, both `["Geist Sans", "ui-sans-serif", "system-ui"]`,
both sourced `system` — so nothing on this page loads from Google and nothing
is uploaded, and Geist Sans is not installed on a CI machine or on most
readers'. The specimens are honest about that rather than letting the fallback
pass for the font, and the note is printed once per family rather than once per
entry. It also means the Google and uploaded paths are written and unit-tested
but have never rendered on this page. A reference workspace with one Google
family and one uploaded family would be a better fixture, and is worth doing
before stage 5 hands one to a client.

### Closing those findings

**The stored size was worse than dead, and could not be deleted.** The note
above said the reference workspace stores every role at 16px. What it missed is
that the CSS export read that field directly, so a client installing the
generated file got a design system in which every text role was 16px —
`--font-h1-size`, `--font-h2-size` and `--font-display-size` all the base size
beside a correct `--font-size-8: 62px`, with the line heights wrong alongside
them because a line height is computed from the size it sits on. Invisible from
the studio and from the documentation, both of which resolve before rendering.
Only the artefact that leaves the building was wrong.

The field itself stays. It looks dead because every value in a seeded system is
inert, but it is the store for a hand-set size: the studio's size input writes
there and sets `stepOffset: null`, and an unlinked role has no step to resolve
against. Removing it would have deleted the Custom size and silently reset
every role somebody had tuned. `resolveSystemRoles` is the only path to a size
anything renders or writes now, and a guard holds the row builder and the
exported file to the same number.

No file version bump. The shape did not change and no reader needs to tell the
two apart, so a bump would have added a number to
`SUPPORTED_WORKSPACE_FILE_VERSIONS` that distinguishes nothing.

**The template slot rules had to be a hierarchy, not one role per group.** One
role per group gives `h1` for a heading slot, which on a default system is
62px — the same as `display-1` — so the hero, the standfirst and every section
heading would have come out identical and the article would have looked broken
in a new way. A standfirst is a subordinate title and a section heading sits
under it, so they take the second and third heading roles. Measured in the
studio: 62 / 48 / 40 / 16 where it was 62 / 16.

**The Google path had never run, and now has.** Both fixture entries were
"system Geist Sans", a family in no catalogue, never uploaded, installed on no
CI machine. Space Grotesk with Kanit and Work Sans with Sarabun replace them —
a Latin face and a Thai face per entry, none of them the studio's own Inter or
Noto Sans Thai. All four load, and the Thai is drawn by the Thai face rather
than by a system fallback: measured per family, the display stack and Kanit
alone are both 284.12px against 286.79 for Space Grotesk and for serif.

**Clipping was in the two tables written first.** The typography table was
fixed when it was found; the colour and semantic tables carried the same
`nowrap` and clipped a hundred and seventy cells between them at 900px. All
three are clean at 900 and 1280 now. Seven `sr-only` spans still measure as
clipped and should: 1px wide holding 50px of text is the visually-hidden
pattern working, and it is indistinguishable from a real clip unless you ask
why.

## Notes from stage 3, spacing, radius and elevation

**The row builder is thin, and that is the finding.** Its colour and typography
siblings exist because two readers would otherwise each decide what a row is.
Here they would not: `resolveSpacing`, `resolveRadius` and `resolveElevation`
are what `scale-export.ts` already calls to write the file, so a page calling
the same functions cannot print a variable the file lacks. `scale-rows.ts`
carries only the two things a page needs and an export does not — elevation
paired across its two modes, and the shade a shadow was drawn from, which the
resolution otherwise consumes. Where the naming rule is already one function,
a row builder should be small enough to look unnecessary.

**Elevation is the one page whose grounds cannot be semantic utilities.** The
page has to show a level on a light ground and a dark one at the same time, and
a semantic utility resolves to whichever mode the reader is in — `bg-surface-base`
would draw the same ground twice and quietly prove nothing. The playground's
editor reaches for `--color-neutral-50` and `--color-neutral-900`, which is a
primitive and not something a documentation page may name. So the grounds are
`surface.base` and `surface.raised` resolved per mode and passed in as values,
the way `Swatch` already takes a hex. Stage 4's scanner should treat that as
the shape that passes: a role named, resolved from the workspace, never typed.

**The plan was right about spacing and had already corrected itself.** "Spacing
is not geometric" is the first thing the roadmap says, and it says it as a
correction to its own earlier draft. That correction is load-bearing: it is
what the page's opening section is about, and a scale generated with the type
maths would have shipped 6.25px steps that look principled and cannot be used.
Nothing on these three pages contradicts the plan. The only thing it did not
anticipate is the ground problem above, which is a documentation concern rather
than a scale one.

**Radius has no description problem and typography did.** Every radius token
carries its own `description` — "a button, an input, a badge" — written when
the token was defined, so the page's table has a "what it is for" column filled
from the workspace rather than from the content module. Spacing steps and type
roles have no equivalent, which is why their pages carry more prose. A token
that knows what it is for is worth more than a paragraph that knows it.

**One prose convention had to be enforced against itself.** The guidance names
a counter-example — "there is no radius ramp here and no radius-2" — and the
test that checks every backticked token exists would have failed on it. The
answer is that a counter-example is not a token and does not get backticks;
neither do rgba, var() or box-shadow. The convention is that a backtick means
"this exists", which makes the test's job stating the obvious rather than
guessing.

## Notes from stage 4

**The allowlist is empty, and two entries were expected.** The elevation page's
grounds and the `Swatch` were both predicted to need one, and neither does. The
reason is the same for both and worth writing down: a value that arrives as
data is invisible to a scanner that reads text. `Swatch` takes a hex as a prop;
the elevation grounds are `surface.base` and `surface.raised` resolved through
`resolvedRoleReference`. The only literal either file held was a `#ffffff`
fallback for a workspace missing the role — and a white rectangle would have
been the page inventing a colour nobody gave it, so it draws nothing now.

The list stays as an emptiness rather than being deleted. The next value typed
into a page fails there, and the argument for the first entry has to be written
beside it.

**Three skips, and a skip is not an allowlist entry.** They say "this file is
not a page", where an allowlist entry says "this page may keep this value".
`app/blueprint` is the generated export, named by the plan. A test names the
values it asserts on; that is what a test is. And a content module is prose —
`content/scale.ts` explains that a ratio of 1.25 over a 4px base gives 6.25px,
which is the argument for the whole spacing page and cannot be made in tokens.
Both already have tests of their own that check every token they name exists.

**The check had to learn the difference between the two apps.** The scale plan
says `p-4` reaches a measurement without writing px, and it is right about the
studio, whose `theme.css` declares colour and nothing else. The documentation
installs a generated `@theme` built from the workspace's own spacing and radius
scales, so `p-4` there _is_ `--spacing-4` and `rounded-container` _is_
`--radius-container`. Flagging those would have pushed these pages into inline
styles to satisfy a check. The scanner takes the token lists now: a utility
naming one passes, and `gap-2.5` — which the Button page had — is reported,
because 2.5 is not a step this scale has. The mechanism the plan wanted
survives one level in.

**Sizes are not spacing, and only half the check knew.** The Tailwind half had
always ignored `w-56` with a written reason: a size is a different family and
the plan defers it. The CSS half flagged every length, which only showed when
it met a page with a content column — `72rem`, `48rem` and `14rem` on the home
page, none of which any token in the system can express. Both halves agree now.

**Two false positives, and both were identifiers.** A local `const rounded =`
in a table and `fontFamily: row.fontStack` in a specimen. A Tailwind utility
only ever reaches a page inside a string, so the Tailwind patterns look only at
quoted spans now. A check that reports a variable name is a check somebody
switches off, which is the failure mode this whole stage exists to prevent.

**`rounded-3xl` was invisible.** The radius pattern allowed letters after the
hyphen and nothing else, so a numeric suffix left it matching bare `rounded`
and then failing its own trailing check. Both instances were on the Button
page, which is where a scanner that had never been pointed at this app would
be expected to have a hole.

**The scanner got its own entry point, and the playground stopped compiling
until it did.** Re-exporting it from the package root pulled `node:fs` and
`node:path` into the browser bundle. A build-time tool is a different product
from a component library, and `@blueprint/ui/primitive-usage` is the door for
it.

### The roles the sweep could not name

Each of these is a page reaching for something the layer does not have. None
was worked around; all are recorded here because the roadmap's own rule is that
a page argues the vocabulary into shape.

**Four levels of grey text and two roles.** The Button page distinguished
`neutral-500`, `-600`, `-700` and `-900`. The layer has `fg.primary`,
`fg.secondary` and `fg.disabled`, so three of the four collapsed onto
`fg.secondary`. Either the page was making a distinction nobody needs, or the
layer is one foreground short — a `fg.muted` between secondary and disabled.
The pages read fine collapsed, which is weak evidence for the first.

**No type role under 16px, and three pages need one.** An eyebrow, a card
title, a badge and a caption all reach for the step tokens `--font-size-0` and
`--font-size-1` because the type system's smallest role is `body`. The
typography guidance already says reaching for a step is a sign a role is
missing; the home page is now the evidence for that sentence. A supporting
group — label, caption, overline — is what the typography rework's own group
table listed and `defaultSystem` never built.

**No size family.** Three container widths on the home page and a grid track on
the typography page. The scale plan defers size tokens to a later stage and
this is the first page that wanted them.

**No gradient.** The Button page's header was a three-stop gradient across
`neutral-50`, white and `neutral-100`. There is no gradient family, so it is a
flat `surface.base` now. That is a visible change and the only one in the
sweep that lost something rather than moving it.

**No spacing step at 80px or 10px.** The home page's outer rhythm wanted 80 and
the scale stops at 64; `gap-2.5` wanted 10. Both were rounded to a neighbouring
step rather than adding to the scale, since one page is not yet an argument.

### One of the five roles has been added

Stage 4's notes listed five things the swept pages could not name. The first of
them is closed: there is a type role under 16px now, two of them — `label` at
12px and `caption` at 11px, in the default system and in the reference
workspace.

They were added the way the roadmap says a token should be: because two
products reached for one and could not find it. The article template's kicker
and byline and this app's eyebrow, badge and card action were all naming bare
step tokens, and the typography guidance already said that reaching for a step
is a sign a role is missing. The home page keeps exactly one such reach — a
card title at 16px, which is a heading with no heading role at that size — so
the sentence keeps one piece of evidence rather than five.

**The typography page needed no edit.** Two groups and two rows appeared in its
table, with their guidance above them and their six variables beside them,
because the page is a template over the workspace and the guidance is keyed by
group id. That is the claim stage 2 and stage 3 made about every page here, and
this is the first change that tested it from the data side rather than by
rendering the same workspace twice.

The other four remain: four levels of grey text against two foreground roles,
no size family, no gradient, and no spacing step at 80px.

## Notes from stage 5

**The archive splits along what a browser can do, and that is what closes the
open question.** Everything in `buildHandoverFiles` is a pure function of the
project, so the export dialog produces it and a client gets an archive from a
button. The foundation pages are a Next build, which a browser cannot run, so
`pnpm handover` makes those and zips both halves. The documentation is
therefore build-time with a parameter — `BLUEPRINT_WORKSPACE`, read by both
`lib/workspace.ts` and the stylesheet generator — rather than a runtime tool
that reads a dropped-in file. A deliverable is what this stage is for; the tool
can follow if a client asks.

**Every docs route exports statically, which was not certain before checking.**
Eight pages and the not-found, all prerendered, no route handlers, no dynamic
segments, no `next/image`, no cookies or headers. `output: "export"` is opt-in
through an environment variable rather than always on, because it also disables
`next start` — which is what the screenshots and the local e2e runs use.

**Next has no way to make a static export open from a folder.** `assetPrefix`
is one string for every page, and a page two directories down needs a different
prefix from the one at the top. So `trailingSlash` makes every route
`dir/index.html`, which gives each file a predictable depth, and the handover
script rewrites `href`, `src` and `url(` per file afterwards. Measured on the
output: no absolute reference survives, and `foundations/colour/index.html`
asks for `../../_next/...`.

**fflate over jszip, checked before choosing.** fflate 0.8.3 is MIT with zero
dependencies, last touched July 2026. jszip 3.10.1 is dual MIT/GPL, pulls four
runtime dependencies — one of them `readable-stream`, a Node polyfill that
would ship to the browser — and its last release is August 2022. Both do the
job; only one of them is a single import with nothing behind it.

**The first real download shipped an empty file.** `designSystemFiles` returns
a fixed-shape record, so a workspace with no type scale gets `""` for
`blueprint-typography.css` — seven good files and a zero-byte stylesheet,
listed in the README as though it worked. A file with no contents is left out
now, and because the README is generated from the list, its description goes
with it. Found by downloading an archive rather than by reading the code, and
only because the studio's own e2e fixture happens to be palette-only.

**The archive is guarded by what was written, not by what was meant.**
`unexpectedHandoverPaths` takes the real directory listing, so a file copied in
by hand or left behind by an earlier run is named and the run stops. Checking
the script's intentions would have proved only that the script agrees with
itself.

**An expectation guessed from the data model was wrong about the page.** The
first version of the verification script asserted 72 semantic rows and found
116, because the semantic page carries the contrast table as well as the role
tables. Both counts are now derived from the archived workspace through
`semanticRowGroups` and `typeRoleRowGroups`, which is the same rule the pages
render by — so the check cannot be wrong about the model or the page.

**Proved from `file://`, twice.** The reference archive unzips into a temporary
folder and every page renders there with no failed request that is not a
`file:` URL, in both modes: 72 semantic roles, 10 type role rows. Then a second
workspace with a green primary instead of the purple one, built through the
same command, shows `#0B7A3D` on its colour page and does not show `#7646AB` —
which is the assertion that the parameter reached the pages rather than merely
the build.

## Notes from stage 6

**A suite that renders components is not a suite that checks a site.** The unit
tests render each table twice with a value changed, which proves the component
is a template. They cannot see a stylesheet that did not ship, a client
component that throws on hydration, or a mode attribute nothing applies. The
first run of the browser suite found three things of that kind in one go.

**Expectations are read from the workspace file, not asked of the package.** An
assertion computed with `semanticRowGroups` would agree with a page rendered by
`semanticRowGroups` whatever either of them did. Reading the JSON and doing the
arithmetic in the test says something the page cannot make true by itself: the
file says the base unit is 4, the screen says 16px, and 16 is four fours. It
also sidesteps the loader problem — the package entry is a `.tsx` that pulls in
React and Astryx, which Playwright's Node side cannot resolve.

**Two things about the app the suite had to learn.** With nothing stored, the
shared colour-mode hook falls back to **dark** and then persists it, so an
empty key is not the system state — it is a reader who has not chosen, and they
get dark whatever their machine prefers. And an init script runs on every
navigation, so seeding the mode without a guard made a test about persistence
measure the fixture rather than the app.

**`aria-level` on a native heading does nothing.** The typography page's
heading specimens carried `role="heading" aria-level="4"` to keep them out of
the page's outline, added in stage 3 with a comment explaining the reasoning.
Measured here: Chrome reports `heading "…" [level=1]` for that exact markup —
the native tag's implicit level wins. It has been removed, because a comment
claiming a fix that is not happening is worse than the problem. The page has
three level-one headings and the reason is written where the code is: the plan
asks for each role rendered as its real element, the table says `<h1>`, and the
specimen has to be one.

**A template's heading level belongs to its host.** `ArticleTemplate` rendering
an `<h1>` is right in the studio, where the preview stage is the page, and
wrong on a documentation page that already has one. It takes a `headingLevel`
now, defaulting to 1 so the studio is unchanged.

**The handover job runs on merges only, and that is a trade rather than an
oversight.** It builds the documentation a second time and opens every page in
a browser — roughly four minutes on top of a run that already builds twice.
What it guards is a command nobody runs by accident, so catching a break at the
merge is soon enough to matter and late enough to be affordable. If the
handover ever becomes something a person runs weekly, it should move onto pull
requests.
