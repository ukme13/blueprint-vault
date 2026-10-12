# 2026-10-12 — The contrast score is a div

One commit on `fix/contrast-score-markup`.

## Key changes

- The score row in a shade's details was a `<p>` holding the ⓘ button,
  whose Astryx `Tooltip` wraps it in a `<div>`. A div cannot sit in a
  paragraph; React reported a hydration error on `/colour`. The row is a
  `<div>` in both the WCAG 2 and the APCA result. Its styles are by class,
  so nothing moves.

## Lessons learned

- **Astryx's `Tooltip` adds a block element.** Anything that wraps a
  tooltip trigger has to be allowed to hold a div.
- **React's nesting warning is development-only,** so a production-build
  spec cannot listen for it. The spec opens the details under each
  standard and checks the DOM: no paragraph holds a div.
- **Pressing the lit contrast standard turns contrast off,** which a spec
  switching standards has to know.

## Checks

- `pnpm lint`. Playwright against a production build: the shade details
  spec file, 17 of 17; the new check fails with the `<p>` back.
