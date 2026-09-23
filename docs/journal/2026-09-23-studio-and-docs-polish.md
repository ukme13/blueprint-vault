# 2026-09-23 — 0.2.0: a day of polish, and one table bug found three times

Twenty-two commits, merged locally one change set at a time and shipped
together as the first release with a version number. Most of it is polish
found by using the studio and the docs rather than by building them. The
version itself has its own entry, `2026-09-23-studio-version.md`; this one is
the rest.

## Key changes

### Studio shell and Home

- **Studio guide in the chrome.** A link on the right of the Home top nav and
  pinned to the bottom of the studio rail, both opening the docs in a new tab
  from one `STUDIO_GUIDE_HREF`. `SideNavItem` declares neither `target` nor
  `rel`, so a small `NewTabLink` passed through its documented `as` prop
  carries the new-tab behaviour instead of a cast.
- **An empty Home that points somewhere.** With no projects, two cards
  centred under the header: create a project, or read the guides. The header
  stays, keeping Import and the "Projects" heading that eight specs land on.
- **The version on the rail.** `v0.2.0` under Studio guide, read from
  `lib/studio-version.ts`, now the one place the playground reads
  `STUDIO_VERSION`; the export dialog uses it too. A Space badge on the
  Preview item names its shortcut, `aria-hidden` because a spec matches that
  link's name exactly.
- **One button size rule, by role.** Page actions are medium, 36px: Home's
  Import and New project, and Import and Export in every studio. Secondary
  toolbar actions under the tabs are small, 28px. Dense panel controls stay
  small or xs. A 44px trial on Home was withdrawn before it was ever pushed.
- **The Next dev indicator moved bottom-right,** off the rail's guide link.

### Preview and elevation

- **Preview button labels take the project font.** Text blocks resolved their
  type role; the buttons never did, so they inherited the studio's face.
- **Dark shadows show in the elevation preview.** Its dark ground was the
  darkest neutral, the same shade the shadow is drawn in, and a colour over
  itself is the same colour at any opacity. The ground now starts a step up.
  Dark seeds went from 0.2 to 0.4, High's cast to 0.6, for new projects only.
- **Keylines and pad ink follow the sample's mode, not the studio's.** Both
  had used tokens that flip with the studio theme, which drew a white
  wireframe round a dark card in a light studio, and black dots on the dark
  pad.
- **The preview's brand is text only,** and its paired buttons sit 8px apart
  through `--spacing-2`, the workspace's own token.

### Documentation site

- **Two-level navigation.** The header centres Foundations, Components and
  Studio, the sidebar shows only the current section, and the footer offers
  Getting started, What's new and Open Studio. The Button page gained the
  header it never had.
- **A roomier header** at 64px with the logo at 28px; the height now lives in
  `lib/header.ts` beside the stylesheet's `--docs-header-height`.
- **Tables that fit their content.** Every doc table is framed, its header
  shaded, its lines softened; contrast pairs read on two lines; track and
  semantic columns are sized for what they hold.
- **Foundations polish.** Type specimens as cards, spacing bars on one
  shared edge, and a keyline on the dark elevation card.

## Architectural decisions

- **Audience decides the navigation, not the component.** The docs ship to
  clients inside the handover, where the Studio pages must never appear.
  Header sections, sidebar and footer are all derived in `lib/nav.ts` from the
  route groups already filtered for the build's audience, so a client build
  has no Studio link to render and cannot be given one by accident. A test
  holds the client footer free of every studio string.
- **Derive, don't list.** Section links point at each group's first route,
  and the footer's labels come from the route list, so a page added later
  reaches the header, sidebar and footer without an edit.
- **Fix the preview, not the product.** The dark shadow was already visible on
  real pages; only the studio's sample hid it. Changing the preview ground was
  the fix, and the stronger seed a separate, smaller improvement.
- **Every table rule lives in one place.** Astryx renders a scroll wrapper and
  classed cells for every table, so the docs stylesheet frames all nine from
  one rule set instead of editing nine components.

## Lessons learned

**Search the rendered class list, not the component file.** The Shade column
collapsed to one letter through three fixes. First I blamed Astryx Text's
`word-break: break-word`, which is real and does squeeze code columns. Then I
blamed `overflow-x: hidden`. The actual cap was `max-width: 0`, put on every
table cell by Astryx's shared table styles with four IDs of specificity; a
max-width beats any width. It was missed because the search covered
`TableCell.js` and not `table.stylex.js`. The rendered cell's class list names
every rule in play, and one look at it would have found the cause on the first
day. The user found it.

**Do not claim what was not measured.** Twice a summary said a column would
"size to its content" or a header "cannot truncate", and both were wrong. With
no browser allowed, the honest move is to read the rendered markup and the CSS
source, and to say plainly when a layout claim is reasoning rather than
observation.

**Scanners read more than they appear to.** The docs' hardcoded-value scanner
rejects `px` in a test title and a fallback such as `var(--spacing-6, 24px)`;
the primitive scanner rejects `rgba(` anywhere in playground components.
`color-mix(in oklch, white 8%, transparent)` and a token without a fallback
pass both, and each departure is recorded where it happened.

**A theme token follows the page, not the sample.** A preview of the
workspace's dark mode sits inside a studio that may be in light mode. Anything
drawn on that sample, like a keyline or a grid dot, has to take its colour from
the sample's mode, or from a fixed mix that reads on both.

## Checks

- `pnpm lint` at `--max-warnings 0`, `pnpm check-types`, and `pnpm build` for
  both apps, all clean on the combined main.
- `packages/ui` 1174 and `apps/docs` 65 unit tests.
- Playwright not run locally, by request. The two new Home empty-state tests,
  the updated header-position test and every spec touched by the size, font
  and shadow changes first run on this push.
