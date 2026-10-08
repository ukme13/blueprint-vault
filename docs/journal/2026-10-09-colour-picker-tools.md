# 2026-10-09 — The colour picker can move, and can sample

Two commits on `feat/colour-picker-tools`, stacked on `feat/contrast-wcag3`. The
picker opens beside its trigger and covers the shades it is for; it can now be
put somewhere else, and it can take a colour from the screen.

## Key changes

- **A movable panel on a wider screen** (`useDraggablePanel`). The header's own
  empty space is the handle, with a grab cursor and a grabbing one while held.
  It moves the popover the panel sits in, by the `translate` property, which is
  separate from the `transform` the popover's own placement may use. It is held
  within the window on every side, and goes back to where it opens when it closes.
- **An eyedropper** (`useEyeDropper`) beside the HEX field, where the browser has
  one. It samples any colour on screen, the shade matrix included, applies it,
  and shows it in the field at once. Without `window.EyeDropper` the button is
  not rendered; dismissing it with Escape changes nothing and can be tried again.

## Architectural decisions

- **A drag starts only on the header itself.** The first version ignored a list of
  controls; the format dropdown's options are inside the header, were not on the
  list, and lost their clicks to the pointer capture. "Only the header's own
  space" cannot miss one.
- **Support is read as an external store.** `isSupported` is false on the server
  and the first render and settles in the browser, so a button gated on it is
  never in the server's markup and cannot disagree with it.
- **The panel is told when it closes** (`isOpen`) so it can put itself back; a
  popover keeps closed content mounted, so closing does not unmount it.

## Lessons learned

- **A press that starts a drag takes the pointer from whatever it landed on.** Its
  click never comes. That is how an existing test, the OKLCH slider greying,
  caught the first version.
- **The room to move is less than it looks.** The picker opens low in the window,
  so a test that dragged it down 60px found 38 available. The clamp was working.
- **A test that dragged the mouse thousands of pixels outside the window found
  the dialog gone afterwards**, and its cause was not tracked down. The tests drag
  to the window's corners instead, which the panel's grip can never reach
  because an edge meets the window first.

## Not done

- It moves by pointer only. A keyboard user cannot reposition the panel.
- A phone's sheet has nowhere to go and is not movable. It has the eyedropper
  only where the browser does, which is not most phones.
