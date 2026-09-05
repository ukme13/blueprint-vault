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
writes the project, with a version 2 migration and storage as a parameter. The
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

1. **The reference workspace and the build-time export, no UI.** Check in
   `apps/docs/blueprint/reference.workspace.json`, a real project saved from
   the studio. Add a `prebuild` step that runs the three system formatters
   over it and writes `apps/docs/app/blueprint.css` and the Tailwind and DTCG
   siblings. A test regenerates and compares, so a formatter change that moves
   the output shows in the docs app's diff rather than in a client's inbox.
   The docs app imports the generated CSS and nothing from `theme.css`.

2. **Colour.** One page for the primitive tracks and one for the semantic
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
graph. The moment it does, it stops proving the export.

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
