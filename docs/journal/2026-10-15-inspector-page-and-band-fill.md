# 2026-10-15 — The inspector shows the page, and a band's fill is empty until one is added

Eight commits on `feat/inspector-page-section`. With nothing selected the Inspect
panel now shows the page's own colour, and a band's Fill follows the same
empty-until-added rule as Stroke and Effects. The Designally preset was updated to
the workspace as it was last saved, which uses both.

## Key changes

- **A Page section when nothing is selected.** It is a Fill row like any other:
  default `Surface base`, changeable to another token, with a Reset that puts it
  back. Its style is kept under the id `page` in `previewStyles`, so it is undone and
  reset like every other element's.
- **The page is painted; its bands let it show.** The page style sets the canvas's
  `backgroundColor` and a `--preview-page` property. The canvas role
  `--color-surface-base` is not rebound, so nothing else that reads it moves. The sticky
  nav is the exception: content scrolls under it, so it takes the page's colour from
  the property and stays opaque.
- **A band's fill gains a `none` state.** `PreviewSectionFill` is `none`, a token, or an
  image. The bands that sit on the page are seeded with `none` and draw transparent;
  Quote and Newsletter are seeded on `surface.raised`. The seed map is
  `PREVIEW_SECTION_SEED_TOKEN`, with `null` meaning none.
- **Fill + on a band.** An empty band shows a collapsed `Fill +` row. The `+`, or the
  row, adds a token (the band's seed, else `surface.raised`); a `−` is the only way
  back to empty. Choosing `surface.base` from the list is a fill like any other: it
  stays on the band, opaque, and the page's colour no longer reaches it. An image
  fill disables the `−`; the image is removed from the band's ⋯ menu as before.
- **Preset.** `designally.blueprint.json` is the saved workspace again (spacing at 1x
  squished to 0.75, three bands with no fill, the page painted). Its test holds those
  values.
- **Tests.** Unit tests for the fill helpers, the draw rules, the seed and the
  overridden check; five end-to-end tests for the band Fill (empty by default, add and
  remove, press the row, Reset, a raised-seed band) and one for surface.base staying
  put when the page's colour changes. Each was broken once on purpose and failed.

## Architectural decisions

- **No fill is a value, not a token.** The first version called a band on `surface.base`
  empty. That made choosing `surface.base` indistinguishable from having no fill, and
  it collapsed the row back to `+` on a deliberate choice. Empty is now `{ kind: "none" }`
  and every token, the page's own included, is a fill.
- **The fill rules live in `packages/ui`.** `previewSectionFillWithToken`,
  `previewSectionFillTokenId`, `previewBandFillToAdd` and `isPreviewSectionSeedFill`
  take a value and return one, so they are in `preview-sections.ts` and tested there.
  The band's Fill is its own component, `BandFillSection`, and the panel hook only
  binds the domain function to state.
- **The canvas role stays put.** The first Page implementation rebound
  `--color-surface-base` so bands followed it. That moved everything drawn from the
  role. Painting the canvas and letting bands go transparent gets the same result
  without touching the role.

## Lessons learned

- **A rule that needs a second state needs a second value.** Encoding "empty" as one
  token made the data model unable to say what the person had done. It showed up
  only when the choice that mattered, picking the page's own token, was tried.
- **Saved projects are read as written.** A project saved earlier with `surface.base`
  on a band now reads as an explicit fill: the band stays opaque and does not follow
  the page. A stored default cannot be told from a deliberate choice, so it is not
  migrated.
- **Band fills are not in the undo-owned parts.** Ctrl+Z does not undo them, and a press
  while one is selected took the page to the Typography tab. That is older than this
  branch and was left alone; the end-to-end test covers Reset instead.
- **A button-width test failed twice under load** (`preview-inspect-native`, the
  contained/outlined variant tests, by about 3px) and passed on the next full run.
  Reported, not changed.
