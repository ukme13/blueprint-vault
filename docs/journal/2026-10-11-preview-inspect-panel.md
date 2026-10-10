# 2026-10-11 — A Figma-style inspect panel for the Preview page

Seventeen commits on `feat/preview-inspect-panel`. The Preview page used to
change one thing at a time through dialogs. It now has a panel beside the page,
drawn from the Figma design (node `18653:6045`), that shows what the selected
element is made of and changes it. Everything it sets is saved with the
project, a reference to something the system already names, and undone with
the same Undo as the rest of the studio.

## Key changes

- **A panel beside the page, not over it.** Select text, a button, a band, a
  card, a chip or a divider and the column shows that element's sections: Copy,
  Auto layout, Appearance, Typography, Fill, Stroke, Effects. What an element
  offers is a table (`PREVIEW_INSPECT_FIELDS`), by kind. On a phone the panel is
  a bottom sheet, and every list in it opens as a sheet too.
- **Per-element styles, as references only.** A step of the spacing scale, a
  token of the radius scale, a level of the elevation scale, a semantic token.
  Opacity is the one number. No free length can be typed. Saved in the
  typography slice as `previewStyles`, absent when empty, so a project saved
  before this reads unchanged.
- **Undo owns it.** `previewStyles` is one of the undoable parts; going back
  past the point the slice was made removes the styles too. Reset to default
  puts back copy, type, colour and styles in one step.
- **The panel shows what the page is drawn with.** A contained button shows its
  shadow, an outlined one its edge, a card its fill and border, a band its
  divider. Removing one is the person choosing none (`stroke: null`,
  `shadow: null`); Reset gives back the native one. The defaults are one table
  (`preview-native`) that an end-to-end test checks against the page's own
  computed style for every button.
- **Default has the number.** The Default row of a gap, padding or radius list
  says what the page draws, in pixels, and so does a control with nothing set.
- **More of the page is selectable.** The three card groups (the featured plan
  on its own), the "Popular" tag as a chip with a fill, radius, padding, stroke
  and its own text colour, the newsletter field as a surface, the footer's last
  row as the owner of its divider. A button has a label colour of its own;
  left alone it is still derived from its fill.
- **One edge, not two.** A stroke replaces the border an element already has,
  and keeps the shadow it had when it is drawn as a ring. A divider's stroke is
  on one side and is drawn as a border of that side.
- **The selection outline** is measured every frame, finds its element again
  each time, and is carried by a sticky nav from inside it. Outlines of what
  has scrolled under the nav are under it.
- **Figma's icons** for the panel's controls, as `currentColor` components in
  `packages/ui` (`components/icons/inspect`), with tests.
- **Smaller:** lists drop the check mark and wash the chosen row lightly; a
  band has no Gap (a block with one wrapper has nothing to space) and no ⋯
  menu unless it still holds an image from an earlier version; the image
  upload is gone.

## Architectural decisions

- **Domain in `packages/ui`, the app binds.** Kinds, fields, reading, editing,
  drawing (`previewStyleDeclarations`) and the native values are pure and tested
  in Vitest. The app has a hook that binds them to state, sections that render,
  and an e2e spec for the behaviour.
- **Absent and `null` are different.** Absent is "the page's own"; `null` is
  "none, by choice". It is what lets an outlined button show its edge and lose
  it, and a reset bring it back.
- **Longhands only.** The base styles set colours as longhands, so the inspector
  writes `backgroundColor`, the four paddings, the four border widths. A
  shorthand beside them makes React warn when one is removed. A unit test lists
  every property the inspector can write and rejects the shorthands.
- **A band and a slot can share an id**, so a band's style is under `band:` and
  its id, and the caller says which it means.
- **What sticks is outlined from inside.** A box moved by script is a frame
  behind a page that scrolls on its own thread. The box of a sticky element, or
  of what is in it, is a child of that element and is carried by the same
  scroll.
- **Defaults are read from a twin.** The page's own number for a padding or a
  radius is read from a copy of the element with its inline style taken off, so
  a change already made does not hide the number it replaced.

## Lessons learned

- **A dev-only warning is not in the build the suite runs.** "Removing a style
  property … conflicting property" appears only under StrictMode in
  development. The end-to-end suite runs the production build, so the fix is
  held by a unit test at the source and a console test run with `E2E_DEV=1`.
- **A size observer is blind to three things we hit:** inline text, an element
  that only moved, and a node React replaced. Measuring each frame and looking
  the element up again each time covers all three.
- **Read a colour after it stops easing.** Astryx buttons transition between
  colours and shadows, so a computed style read right after a change is
  mid-flight. The tests read it once it is settled or poll to the final value.
- **A helper that matches on text matches what you add to it.** Putting the
  number in the Default row made a test that picks "8px" pick Default. The
  helper now skips that row unless asked for it by name.
- **Make a test fail before trusting it.** Several rules here were broken once
  on purpose (the native table, a one-side border, the label colour, the twin)
  and the test confirmed to fail. Two of the first tests did not: one passed on
  the old code, and one mutation was shielded by a button's own inline insets.
  Both were rewritten to the case that does fail.
- **An `:popover-open` guard can match a toast.** Escape never deselected
  because a permanent toast popover was always open. The guard is `dialog[open]`
  or an open listbox.
- **Two outlines were one border too many.** The panel said Stroke was empty
  while the button was plainly outlined, and a stroke on top drew a second line.
  Showing the page's own values was the fix, not hiding the second one.
- **A control that does nothing is worse than none.** Gap was offered on bands,
  which are blocks with one child. Checking each element's computed `display`
  found it; offering only what has an effect is the rule.

## Open

- The eye (hide) toggle that Figma draws on fill rows is not built: hiding a fill
  is a feature with its own data, undo and tests.
- The nav inflates on Spacious / Editorial because layout uses are bound by step
  name and that preset doubles the base unit. Planned next, on its own branch:
  an `inset-nav-y` layout use, and presets that can carry layout bindings.
