# 2026-10-11 — The inspector's three large files, split

Three commits on `refactor/preview-inspector-cleanup`. No behaviour change. The
inspect panel landed with a 489-line component, a 619-line domain module and a
1890-line end-to-end spec; the repo's own rule is components under about 250
lines and logic in `packages/ui`.

## Key changes

- **`preview-styles.ts` is four files behind the same entry point.**
  `preview-style-model` (ids, kinds, the fields each offers), `preview-style-read`
  (what is stored, tolerantly), `preview-style-edit` (setting, clearing, padding
  and radius by side or corner) and `preview-style-draw` (an element's overrides
  as inline style). `preview-styles` re-exports all four, so no caller or test
  changed its import.
- **`SystemPreview.tsx` is 230 lines, from 489.** `usePreviewScales` holds the
  CSS variables of the frame, the colour each token resolves to and the token
  lists the panel offers. `usePreviewInspector` holds the selection, the Escape
  rule, and the props and edits the panel is given. The component renders.
- **Two pure functions left the component for `packages/ui`**, with tests:
  `previewInspectTitle` (what the panel calls what is selected) and
  `previewIsOverridden` (whether "Reset to default" has something to put back).
- **The spec is four files and a fixtures module**, the same 57 tests grouped by
  what they cover: the panel itself, the edits it makes, the outline, and what the
  page is drawn with. The helpers (`panel`, `section`, `choose`, `style`, …) are
  exported once from `preview-inspect-fixtures`.

## Architectural decisions

- **A split along the section comments that were already there.** The module had
  marked "reading", "editing" and "drawing"; the types and kinds were its head.
  The parts follow that, which is why the move was mechanical.
- **The barrel stays.** Splitting by file and keeping one import path means the
  split costs the callers nothing, and the next one can be made the same way.
- **Hooks bind, the domain decides.** `usePreviewInspector` says which edit each
  control makes; which title to show and whether something is changed are plain
  functions, tested without a browser.
- **`readSlotStyle` is exported from the read file** because the edit file
  normalises through it. It is now part of the package's surface; it is small and
  already pure.

## Lessons learned

- **Count what you moved.** The test count is the check on a split of a spec:
  57 before, 57 after, and Playwright lists the same number from the four files.
- **A word-match finds comments too.** The script that wrote each file's import
  list matched `style` and `pick` in prose and in a helper that is only called
  inside another; lint found both, as unused.
- **Hooks must all run before an early return.** The component returned early
  while the project had not loaded, after its hooks; the extracted hooks keep that
  order, so the loading and the empty states did not need touching.
- **Two tests failed once under load** (a base-unit popover's focus, and the
  sticky nav link's outline). Run alone, each passed.
