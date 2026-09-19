# 2026-09-19 — `/preview` as a site

The demo page was a specimen: a headline about the studio, four buttons, four
alerts, a subscribe box. That is a catalogue. A real column would never layout
that way, and it never used the type tokens — headings were `text-4xl`.

## The page

A landing layout (nav, hero, features, splits, quote, pricing, closing CTA,
footer). Semantic colour, layout uses (`--inset-container`, `--gap-section`,
`--radius-surface`), and type variables the handover file would emit. Which
preview frame is used comes from the canvas width, not `100vw`, so the rail
cannot fake a desktop breakpoint. Columns collapse from that frame id, not
from the viewport.

Click a slot. The inspector writes copy and type role onto `previewLanding`
(the page) or `previewShell` (frozen chrome ids). It never writes the scale.
Typography's document editor still edits `previewDocument`. No EN/TH switch:
the words are the language.

## Checks

Vitest: shell and landing seeds are frozen ids; unknown ids drop; a patch
does not grow the list. Layout and type CSS still name `--inset-container`
and `--font-h1-size` when pointed at a host. Playwright: the hero title,
Sign up as the token-backed control, inspector text survives reload and does
not leak into Typography's article, role change moves `font-size`.

## Lessons

**A heading that is also a control must keep its heading role.** `role="button"`
on the title would have made the page honest to a click and a liar to
`getByRole("heading")`. `aria-haspopup="dialog"` is the signal Space belongs
to the inspector, not to the Preview shortcut.

**The article and the site are different documents.** Sharing `previewDocument`
made sense when `/preview` _was_ the article. A marketing page dumped into
Typography's editor would have been a page builder by accident.

**Section bands must own their spacing for background fills to paint through.**
The original `<main>` layout had `padding-block-start` on direct child sections,
leaving an uncolored canvas gap between Split B and Quad. Wrapping Quad in its own
`Band` (`landing-quad` in `PREVIEW_SECTION_IDS`), making the sections flush, and
distributing `--gap-section` into `padding-block: calc(var(--gap-section) / 2)`
ensured fills paint continuously through section gaps without double padding.

**Why the Selector menu kept jumping to the top of the window, and why CSS overrides were the wrong door.**
This issue recurred across multiple sessions:

1. Astryx's `<Selector>` positions its popover in macOS overlay style by centering
   the currently selected option over the trigger button:
   `desiredTop = anchorCenter - itemCenterInListbox - SELECTED_ITEM_OPTICAL_OFFSET`
   and applies a negative margin `margin-block-start: -${clampedOffset}px`.
2. When `desiredTop` is negative, Astryx clamps `clampedTop = 0`. This produces a
   maximum negative margin `clampedOffset = anchorRect.bottom`, which pulls the
   popover all the way to `top: 0` (the top of the window).
3. Previous attempts to fix this tried either:
   - Forcing `margin-block-start: 0 !important;` in `globals.css`: this cancelled
     the centering entirely and forced the popover to drop underneath the trigger
     like a generic dropdown, losing the selected-item alignment.
   - Forcing `placement="below"` on the `<Selector>`: this explicitly opted out of
     overlay mode, also putting the popover underneath rather than aligned with
     the selected item.
4. The actual root cause was data ordering: `previewTokenSelectorOptions` iterated
   through the palette layer's raw token array where 22 Action tokens preceded
   Surfaces. As a result, `surface.base` and `surface.subtle` were items 23 and 24,
   over 700px down inside the listbox. When one was selected, `itemCenterInListbox`
   exceeded `anchorCenter`, driving `desiredTop` negative and triggering the `top: 0`
   clamp.
5. Preserving the caller's group order in `previewTokenSelectorOptions`
   (`PREVIEW_FILL_TOKEN_GROUPS = ["surface", "action"]`) puts Surfaces at indices
   0–5. With the selected surface near the top of the menu, `itemCenterInListbox`
   is small, `desiredTop` stays positive, and Astryx lands the selected item directly
   over the trigger without any CSS overrides or `placement` props.
