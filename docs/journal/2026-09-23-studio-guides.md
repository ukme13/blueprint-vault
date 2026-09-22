# 2026-09-23 — Six guides, and a faster loop

Stage 4 of the studio guide plan: anchors, semantic tokens and alpha,
typography, the three scales, simulation and accessibility, export and
handover.

## The workflow changed first

Running the full Playwright suite on every iteration was costing more than it
was finding. So this stage ran on the fast checks only — `check-types`, lint,
and the unit tests, which include the hardcoded-value scanner and the route
agreement below — and left the browser suite to CI on push.

That is a reasonable trade for prose. A guide is a content module and a
four-line page; what can break is a type, a lint rule, a scanner rule, or a
route that points at nothing. All four are caught without a browser. What a
browser would add is what the last stage already covered: the shell those
pages sit in.

## Written against the code, not against the roadmaps

Every number in these pages was checked before it was written, because the
roadmaps describe plans and the app has moved past several of them.

`COLOUR_VISION_DEFICIENCIES` is four, not three, and `achromatopsia` is one of
them. `COLOUR_VISION_SEVERITIES` runs 1.0 down to 0.1 in tenths — exactly the
values Machado tabulates, which is why the guide can say every setting is a
published matrix rather than an interpolation. `MIN_GENERATED_FONT_SIZE_PX` is
11 and sizes round to even pixels. The WCAG thresholds are 4.5, 7, 3 and 4.5.
A track's anchors always include the first shade, the last, and the source.

Three of those I would have written differently from memory.

## The route list is load-bearing now

Seven internal routes, and the nav, the home page and the footer are all
generated from them. A path with a typo in it is not a broken import — it is a
dead link in three places, and nothing would have said so.

So `apps/docs/lib/routes.test.ts` checks the two lists agree in both
directions: every declared route has a `page.tsx`, and every page that is not
the home page is declared. Typing `studio/guides/anchorz` into the list fails
both — one for the route with no page, one for the page nothing links to.

## Two false positives in my own tests

**A label is not unique.** The barrel leak test searched for each internal
route's label, and "Typography" is also a client route's label — the
foundations page. The test was right that the string was there and wrong about
what it meant.

Which surfaced a real problem behind it: a sidebar with Foundations →
Typography and Studio → Typography reads as a duplicate. The guide is
"Typography studio" now, which is what the plan called it in the first place.

**A path is not unique as a substring.** Searching for `studio` then failed on
this package's own prose about the studio's preview template. It searches for
the serialised value — `:"studio"` — now, which is the shape a row actually
takes. Same lesson as the archive check two days ago, learned again in a
different place: **match the shape of the thing, not the letters in it.**

## Checks

- `pnpm -r test`: 1168 in `packages/ui`, 44 in `apps/docs`.
- The route agreement test seen failing in both directions.
- The tightened barrel test still catches a real leak: re-exporting the
  internal entry fails it, which is what it is for.
- Lint at `--max-warnings 0`, types clean, Prettier clean. No browser.
