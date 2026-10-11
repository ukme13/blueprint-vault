# 2026-10-11 — Four refinements to how the inspector feels

Two commits on `feat/inspect-ux-improvements`. Small things seen in use: an outline
that shouted, a selection that could only be left by another one, a Plus that was
easy to miss, and a way to see an element with and without its edge or shadow.
Then the black ring that stayed after Escape.

## Key changes

- **A softer outline.** The Preview's selection is the studio's info tone
  (`--color-status-info`) at 70%, border and corner handles; its size label is the
  solid tone with the surface colour as text, so it reads in both themes. The
  Accessibility sandbox's selection uses the same tone.
- **A second press lets go.** Pressing what is already selected deselects it (a
  slot, a band, a card); a third press selects it again.
- **An empty section adds from its whole heading.** Stroke and Effects, while
  empty, take a press anywhere on the heading row; the Plus keeps its own press
  and stays what a keyboard reaches. With an item present the row is not a target.
- **An eye on a stroke and an effect.** `isStrokeHidden` and `isShadowHidden` on the
  element's style: kept and not drawn, so the element can be seen with and without
  it. It hides the page's own edge or shadow the same way. Saved, undone and redone
  with the rest, put back by Reset; removing the item takes the closed eye with it,
  and editing what is closed opens it.
- **Escape lets go of focus.** The Preview and the sandbox blur the active element
  when Escape clears the selection, so no ring lingers.
- **The focus ring is the studio's.** A pickable part (`[data-preview-slot]`) shows
  no ring when pressed and the studio's `--color-focus-ring` when reached by key.

## Architectural decisions

- **A closed eye is a flag, not a deletion.** The chosen stroke or shadow stays in
  the style and the drawing treats it as taken away; showing it again is a flip,
  not a rebuild, and it rides on the history that already owns `previewStyles`.
- **Hidden means the same for what was chosen and what the page had.** The drawing
  maps a closed eye to `null` (taken away), which already zeroes the page's own
  border or shadow; no second path.
- **The ring rule is global, beside the other global rules.** A CSS module's
  selectors must hold a local class, and the pickable parts are chosen by an
  attribute across several components; the global stylesheet is where the app
  already keeps rules of that kind.

## Lessons learned

- **Escape is a key press, and a key press makes `:focus-visible` true.** The ring
  that stayed was not from the click that picked the element; it was the browser
  drawing the ring for the element the Escape key was pressed on. Blurring with the
  selection removes the thing the ring was on.
- **A regex on a computed shadow matches the library's own.** A test that looked
  for "3px" in `box-shadow` was satisfied by the button's own `0 1px 3px` shadow
  and would have passed without the stroke. The ring is matched as
  `0px 0px 0px 3px`.
- **Break each rule once.** The deselect, the closed eye, the heading press, the
  blur and the ring were each broken and their test confirmed to fail. One earlier
  mutation did not apply (a `sed` that matched nothing), and its test "passed";
  the check is that the mutation took effect.
