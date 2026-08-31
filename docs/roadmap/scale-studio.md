# Spacing, radius and elevation

## Goal

Produce the third of a design system, so a client is handed a whole one.

The workspace makes a palette, a semantic layer over it, and a type scale. It
produces no spacing, no radius and no elevation, so every project ends with
those written by hand — which is the part of a handover that silently stops
matching the rest.

## The plan this replaces

It was going to be "the scale studio: spacing is the same maths as type, reuse
`generateTypeSteps`". Reading the tokens first showed that is wrong, and wrong
in three different ways. **These are not one scale repeated three times.**

**Spacing is not geometric.** A type scale multiplies: 16, 20, 25, 31. Every
spacing scale in use — Astryx's, Tailwind's, Material's — is a base unit
counted out linearly, coarsening as it grows. Astryx is 4px × n:

```
--spacing-0-5  2px     --spacing-3   12px     --spacing-8   32px
--spacing-1    4px     --spacing-4   16px     --spacing-12  48px
--spacing-2    8px     --spacing-6   24px
```

Feeding a ratio of 1.25 through `generateTypeSteps` instead gives 4, 5, 6.25,
7.81. Nobody lays out a page on 6.25px. Reusing the type maths would have
produced a scale that looks principled and cannot be used.

**Radius is already semantic, not a ramp.** Astryx names its by use, not by
size, and scales them from a multiplier:

```
--radius-inner  4px    --radius-container  12px    --radius-none  0
--radius-element 8px   --radius-page       28px    --radius-full  9999px
```

That is the shape the colour layer arrived at after four stages. Radius should
start there rather than be given a numeric ramp somebody then has to name.

**Elevation is neither.** Each level is a composite of two shadows, and the
colour inside them changes with the mode:

```
--shadow-low  0px 1px 1px rgba(...), 0px 2px 8px rgba(...)
```

So elevation depends on the colour layer, which is why it comes last.

## What exists today

Four things to build on, and four gaps.

**`theme.css` is 454 lines and every token is a colour.** No spacing, no radius,
no shadow. The workspace consumes Astryx's tokens and produces none of its own.

**The tokens the studio uses are Astryx's, not this project's.**
`css-tokens.test.ts` asserts `--spacing-1` is defined precisely because it comes
from the vendor stylesheet. Nothing here declares it, and nothing here could
hand it to a client.

**This repo's own chrome has 642 px literals, on no grid.** The values include
9, 11, 18, 22 and 30 as well as the round ones. There is no internal scale to
codify — the studio needs one as much as a client does, which makes it the
first honest test of whatever this produces.

**The pattern from the colour layer transfers whole.** A slice on the workspace,
a seeded default set, resolution in one function, an export emitting aliases,
and a page that proves it. What does not transfer is the maths.

**Gap: the workspace file is version 2.** New slices mean version 3 and a
migration, and the supported-set check is already there to extend. The strict
equality that would have refused every saved file is the lesson not to repeat.

**Gap: the primitive scanner only knows colour.** `findPrimitiveColourUse`
catches `--color-*-500`, Tailwind colour utilities and raw hex. It does not
catch `padding: 16px` or `className="p-4"`, so the preview page can quietly
hardcode every measurement it uses and still pass.

**Gap: `1px` is not a spacing mistake.** Hairline borders, and the media-query
widths in the CSS modules, are not tokens anybody wants. A scanner that flags
them gets switched off within a week. The rule needs an exemption it can state.

**Gap: nothing in the export carries a non-colour token.** `formatColourSystemCss`
names its subject accurately today; a spacing layer means either a fourth
formatter or a rename to something that means "the system".

## System model

Three families, one shape each.

**Spacing: a base unit and a step list.**

```
base 4px, steps [0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12]  ->  0 2 4 6 8 12 16 24 32 48
```

The step list is data, not a formula. A generated ramp gives somewhere to start
and the list is then pruned — half steps near the bottom where 2px matters, gaps
at the top where 40 and 44 rarely both earn their place.

**Radius: use-named tokens over a small ramp, plus two fixed.** `radius.inner`,
`radius.element`, `radius.container`, `radius.page`, with `none` and `full`
outside the scale because a pill is not a size. A multiplier scales the named
ones together, which is how a client makes the whole system rounder without
editing five values.

**Elevation: named levels, each a list of shadow layers.** A layer is an offset,
a blur, a spread and a colour — and the colour is a reference to a semantic
colour token, not a literal, so a level follows light and dark the way
everything else does.

All three live in `packages/ui/src/scale/`, beside `color/` and `typography/`.

## First version

The first useful version should let somebody:

- Set a base unit and a step list, and see the resulting pixel values.
- Name radius tokens by use, and scale them together with one multiplier.
- Define elevation levels whose shadow colour comes from a semantic token.
- See all three applied on `/preview`, in both modes.
- Export them beside the colour and type tokens, in one file per format.
- Open a workspace saved before any of this existed.

## Stages

1. **Spacing, no UI.** The model, the seeded default set, resolution to px and
   rem, and workspace version 3 with its migration. Landing the migration first
   is the lesson from the last plan, where the version check would have refused
   every saved file.

2. **The spacing editor, and the scanner extended.**
   `findHardcodedMeasurements` beside the colour one, catching `16px` and
   Tailwind's `p-4`, `gap-3`, `mt-2`. Then `/preview` is rebuilt on spacing
   tokens, and every measurement it cannot express names a step the scale is
   missing — the same mechanism that argued the colour names.

3. **Radius.** Use-named from the start, with the multiplier. Smallest stage,
   and the one most likely to show whether four names are the right four.

4. **Elevation.** Last because a shadow layer references a semantic colour
   token, so it needs the colour layer to point at.

5. **Export and report.** The three families beside the colour ones in every
   format, and the preview page proving all of it. A rename of
   `formatColourSystem*` if the export is no longer only colour.

## Later improvements

- Motion tokens: duration and easing, the fourth family Astryx defines.
- Size tokens for control heights, which currently follow spacing by convention.
- A density multiplier over spacing, the way radius has one.
- Per-breakpoint spacing, if the preview page argues for it.

## Safety and quality rules

**No token that the page does not need.** The rule that kept the colour set
honest. A spacing scale invented in the abstract grows a `--spacing-14` nobody
uses and misses the 6px somebody needed twice.

**The scanner must catch Tailwind as well as CSS.** `p-4` reaches a measurement
without ever writing `px`, exactly as `bg-primary-500` reached a colour without
writing `var`. A check that reads only one of them is avoidable by accident.

**`1px` is exempt, and the exemption is written down.** Hairlines and
media-query widths are not tokens. The rule states what it does not cover
rather than being quietly ignored.

**Export carries every layer in one file.** A spacing token that arrives in a
second file somebody has to remember is the same failure as a semantic alias
without its primitive.

**Elevation colour is a reference, never a literal.** A shadow with a baked
`rgba` does not follow the mode, and a dark page gets a shadow designed for a
light one.

## Definition of done

1. A workspace produces spacing, radius and elevation tokens.
2. A workspace saved before this opens and gains sensible defaults.
3. `/preview` uses no hardcoded measurement, proven by a test.
4. All three families export beside the colour and type tokens, in CSS,
   Tailwind and Design Tokens.
5. Elevation renders correctly in both modes.

## Decisions

Open, with a recommendation for each.

**Base unit: 4px. Recommend taking it as the default and making it editable.**
It is what Astryx, Tailwind and Material all use, so a client's developer
already thinks in it. Editable because an 8px system is a real choice and a
dense product may want 2.

**Units in the export: rem for spacing, px for radius and shadow. Recommend
this split.** Spacing should grow when somebody raises their browser font size;
a 4px corner should not become 6px because of it. This is the same argument the
typography plan made about units being a presentation concern.

**A semantic layer over spacing — `space.gutter` pointing at `space.4`.
Recommend not in the first version.** It is the right shape eventually, and the
colour work says the page should argue for it rather than the plan inventing it.
Building both at once means guessing twice.

**Where the step list comes from. Recommend a generated ramp that is then
pruned.** A pure formula produces 6.25px; a pure hand-list is tedious to start
from. Generate, then edit, and store the result as data.

## Still open

- Whether `1px` is the only exemption, or whether the scanner needs a general
  escape for a value that genuinely is not a token.
- Whether `formatColourSystemCss` and its siblings are renamed once the export
  is no longer only colour, or whether a separate set of formatters is clearer.
- Whether elevation needs a mode-aware opacity as well as a mode-aware colour,
  since a shadow on a dark surface usually wants to be stronger rather than the
  same colour darkened.
