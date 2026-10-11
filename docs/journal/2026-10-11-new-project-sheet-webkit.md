# 2026-10-11 — The New project sheet on an iPhone

One commit on `fix/new-project-sheet-webkit`. On an iPhone the New project sheet
opened with its row of templates squeezed to a sliver: the cards sat below an
empty strip, out of sight. Chromium laid the same page out correctly.

## Key changes

- **The cards take the window's width, not a container's.** The row sized its
  cards from a container query (`100cqi`). They now use `100vw`, which is the
  sheet's width on a phone, where it is full width.
- **The row is never squeezed.** It is `flex: none`, so its own content sets its
  height and the sheet's height cannot take it away.
- **An opt-in WebKit spec on an iPhone profile.** `pnpm e2e:webkit` runs
  `*.webkit.spec.ts` with `playwright.webkit.config.ts`; the Chromium project
  ignores them. It checks the row is as tall as its cards and the cards are a
  size a thumb can use.

## Architectural decisions

- **A viewport unit where the container is the viewport.** A container query is
  right when the container's size is independent of its content. A sheet that
  hugs its content is not: its width is known after the row is laid out, and the
  row's width is what the query asks for.
- **WebKit specs stay out of CI's Chromium run, not out of the repo.** The
  suite CI runs is unchanged; the WebKit one is a command, so the browser is
  installed only by someone who asks for it.

## Lessons learned

- **WebKit measures a hugging sheet before a container's size is known.** The
  query read zero, the cards were zero wide, and the row came out as its padding.
  Nothing in a Chromium suite can see that; only a test in the browser that
  fails can.
- **Make the spec fail first.** The WebKit spec was written against the broken
  CSS and failed there before it was made to pass.
