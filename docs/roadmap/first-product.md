# First product application

## Goal

Decide what the first product is for, then build the smallest app that consumes
the handover the way a client would, so the next components are argued by
screens rather than by a library catalog.

The name already in the README is `apps/ferre`. The name is not the job. Ferre
used to be a typography studio with an Orbitron + Noto Sans Thai preset; that
studio is gone. What is left is a placeholder path and a bilingual stack the
type system actually ships. This plan names the job before the folder exists.

## Why now

The three studios are first-version complete. Colour, type, and scale each have
chrome, history, and a preview that paints a real job. The docs app installs
the generated export, renders six foundation pages from the reference
workspace, and packs a handover. Button is the only documented component.

The README's next priority has been the same sentence since before the
handover existed: define the first product scope, then let that product argue
the next components. Inventing more tokens — motion, control-height sizes,
per-breakpoint spacing, `space.gutter` — is the thing that happens when there
is no page to argue. This plan is that page's brief.

`apps/docs` is the first _client of the export_. It is not a product. A
product team that starts by reading `theme.css` is the failure the docs exist
to prevent, and a product that is a second studio is the same failure with
prettier chrome.

## The job

**Ferre is a bilingual (English and Thai) public practice site.** It is the
first thing a client would actually receive: a small published site, in both
scripts the type system claims to support, built only from the handover file.

That job is chosen because it is already sitting in the repo, not because it
sounds like a startup:

- The type preview's only surviving real-job template is an article. Dashboard
  was retired to a specimen. The first product should do the job the studio
  already uses to judge type, for real.
- Orbitron + Noto Sans Thai is the only working bilingual example in the
  workspace. A first product that ships Latin-only would not be using the
  system it is meant to prove.
- A CRUD admin would invent records, empty states, and a table before any
  screen had asked for them. That is a component catalog with a route.

The commercial domain can change. The constraints below cannot. If Ferre is
later a booking tool or a shop, the same rules apply; the first four screens
below are the smallest set that already stresses colour, type, scale, and
bilingual copy. Extra screens wait until one of those four is wrong without
them.

## System model

**The product installs the export.** `apps/ferre` generates stylesheets from a
checked-in workspace the same way `apps/docs` does (`generate-blueprint.ts`,
wired as `prebuild`). It does not import `packages/ui/src/theme.css`. A test
on its import graph holds that, copied from docs. If the export is missing an
alias, Ferre is the second thing to break, and that is the point.

**Product code stays in the app.** Branding, copy, pages, layouts, and business
logic live in `apps/ferre`. A component moves into `@blueprint/ui` only after
a second real application needs the same one. Until then it is Ferre's.

**Screens argue components, then docs follow.** A shared component is added
when a Ferre page cannot be honest without it. Component documentation beyond
Button is written for those components, in `apps/docs`, after they exist — not
from the Astryx catalog, and not from a list of primitives we happen to have.

**Astryx does the layout.** Discover with `astryx build` / `astryx component`
before writing UI. Page frame first. Dense data is rows, not Card-wrapped list
items. Studio CSS modules stay in the playground; Ferre is a product surface
and should look like one.

**Tokens, never values.** Copy names `fg.primary` on `surface.base`. No raw
hex, no Tailwind palette utilities, no invented 25-interval shades. Spacing
comes from `--spacing-*`, radius from the use-named tokens, elevation from
`--shadow-*`. Hairlines may be `1px`. Nothing else is a literal.

## What exists today

- Playground studios at `/`, `/typography`, `/scale`, with undo history and
  layout previews.
- Docs at port 3001: six foundation pages, Button at `/docs/button`, a
  committed generated export, an import-graph test that forbids `theme.css`.
- `@blueprint/ui` exports engines, tokens, Button, and studio widgets. Button
  is the only product component.
- Handover archive on merge to `main`.
- No `apps/ferre`. No product copy. No second documented component.

## First screens

Four routes. Nothing else in the first cut.

1. **Shell** — every page. Language (EN / TH), colour mode, primary navigation.
   This is where the bilingual stack and the semantic surface/foreground roles
   have to work together, including on a phone.
2. **Home** — what the practice is, in both languages, with a display role that
   is allowed to be a Latin-only face over a Thai body. If Orbitron eats Thai
   glyphs, the page is wrong; the type system already claims it will not.
3. **Article** — one long piece of real copy, English and Thai, using the same
   roles the type preview's article template uses (`display`, headings, body,
   caption). This is the page that finds missing type roles, spacing steps,
   and measure.
4. **Contact** — a short request form (name, email, message, submit). This is
   the page that argues the next component after Button: a text field, then
   whatever validation and helper text it cannot live without.

No dashboard, no account, no project list, no CMS. Those are later products or
later screens, and only if a page above is lying without them.

## Stages

### Stage 1 — This brief

Status: Draft.

Name the job, the screens, and the rules. Point the README at this file.
Nothing is scaffolded until the job in "The job" is accepted or replaced in
this document.

### Stage 2 — Scaffold `apps/ferre`

A Next.js workspace next to `docs` and `playground`. It depends on
`@blueprint/ui` as `workspace:*`. It generates and installs the export the
docs way: a `prebuild` script, committed output, an import-graph test. It
never reaches into `packages/ui` with a deep path.

Port: not 3002. Docs is 3001; pick the next free studio-adjacent port and
write it here when the app exists.

### Stage 3 — Shell and home

Frame, language, mode, home copy. Astryx layout components. Button for the
primary action. No new shared component yet unless the shell cannot be built
without one, and then that component stays in the app.

Playwright covers language switch, mode switch, and that the home heading and
body resolve to the role tokens rather than a hardcoded size.

### Stage 4 — Article

One article, both languages. This is where measure, heading hierarchy, and
caption/meta either work or force a token conversation. Fluid type from the
export should be visible between the named preview widths; if it is not, the
bug is in the product's layout or in the file, and we fix the one that is
wrong rather than adding a breakpoint token.

### Stage 5 — Contact, then the first new component

The form is allowed to be ugly if it is honest. When a native `<input>` is no
longer enough, the field is written in `apps/ferre`. It is documented in
`apps/docs` only after it has a name, variants the form actually uses, and a
reason it is not an Astryx control with token overrides.

A second product needing the same field is what promotes it to `@blueprint/ui`.
That promotion is a later brief.

## Not doing

- **A second Colour, Type, or Scale studio.** Ferre consumes; it does not
  generate.
- **Importing `theme.css`.** Same rule as docs. The test is the rule.
- **Documenting components from the catalog.** Button was documented because it
  existed. The next page in docs is the next component Ferre had to invent.
- **Motion, control-height, per-breakpoint spacing, `space.gutter`.** Still
  "if the page argues." The article and the form are the pages that get to
  argue. Until they do, the scale studio stays as it is.
- **Inventing semantic spacing aliases** (`space.gutter`, `space.section`) so
  the home page looks more like a system. Named spacing waits for a repeated
  use the way colour semantics waited for a page.
- **MDX, a CMS, i18n infrastructure beyond two locale trees.** Two folders of
  copy is enough for four screens.
- **Hosting, auth, analytics, a design-system marketing site.** Out of scope
  for the first cut.
- **Treating the retired Ferre type preset as the product.** The preset's
  bilingual stack is a constraint. The studio of that name is not coming back.

## Definition of done

This brief is done when the job and the four screens above are accepted (or
replaced here in writing), and the README points here instead of at an unnamed
`apps/ferre`.

The app is done when:

- `apps/ferre` exists, installs the export, and fails a test if it reads
  `theme.css`.
- The four screens ship in English and Thai, in light and dark.
- Playwright covers language, mode, and the contact submit path.
- No new file in `@blueprint/ui` except what a second app has already needed.
- Any component the contact form had to invent is documented in `apps/docs`
  the way Button is, or is still local to Ferre with a comment saying why.

## Open

- **Accept or replace the job.** A booking tool or a shop is fine; it has to
  be written into "The job" before Stage 2, because the screens change.
- **Which workspace file Ferre installs.** Docs uses the reference workspace.
  Ferre can use that too for the first cut, or a dedicated workspace with the
  bilingual stack as the default. Dedicated is better the moment the practice
  has a brand that is not Blueprint's.
- **Port and package name.** `apps/ferre`, `@blueprint/ferre` or just `ferre`.
  Decide at scaffold time; do not bikeshed it in this file.
