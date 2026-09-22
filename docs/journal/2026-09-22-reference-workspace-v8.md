# 2026-09-22 — The reference workspace moves to version 8

The follow-up the previous entry left open. The documentation app could
describe a transparent reference and had none to describe: the workspace it
renders was a version 5 file, written before alpha existed.

## Not version 6

The task was framed as "upgrade it to 6", because 6 is the version alpha
introduced. The format is at **8**. Six added alpha, seven added
`removedSeedRoles`, eight added the button schemes. A file three versions
behind is not a file one feature behind, and it is worth saying that the
number was wrong in the framing rather than quietly landing an 8 under a
heading that says 6.

## The obvious command was the wrong one

`pnpm --filter docs seed:blueprint` rewrites the file. It is the script that
made it in the first place, it produces a version 8 file, and every transparent
role appears exactly as wanted.

It also resets the typography slice to Geist Sans — and that is a decision
somebody already made, in the other direction. From
`docs/roadmap/foundations-handover.md`:

> Both fixture entries were "system Geist Sans", a family in no catalogue,
> never uploaded, installed on no CI machine. Space Grotesk with Kanit and
> Work Sans with Sarabun replace them — a Latin face and a Thai face per
> entry, none of them the studio's own Inter or Noto Sans Thai. All four load,
> and the Thai is drawn by the Thai face rather than by a system fallback.

Re-seeding puts the fixture state back and stops the documentation exercising
the Google font path at all, silently, in a diff of eight hundred lines where
nobody would see it. The seed script says of itself that the file is "a fixture
somebody may replace" — and somebody had.

So: **a generator is not an upgrader.** Regenerating gives you today's
defaults; upgrading keeps the decisions in the file and moves the format under
them.

## What was done instead

Parse, patch, format — through the real functions, not by editing JSON.

1. `parseBlueprintWorkspace` on the stored file. That is the migration the docs
   app already runs on every build, so it fills the slices the format has
   gained and rewrites the typography roles into their current shape.
2. For each semantic role the seed marks transparent, copy the alpha across —
   but only after checking the stored reference already points exactly where
   the seed points, and throwing if it does not. The seed's weight and its
   alpha were measured together in stage 5, so taking one without the other
   would change a colour.
3. `formatBlueprintWorkspace`, round-tripped back through the parser, with the
   version and the display font both asserted before anything is written.

144 references checked, 34 given an alpha, 0 non-alpha changes in the semantic
slice. The palette gained empty `adjustments` objects and spacing gained an
explicit `density: 1`, both of which are defaults being written down rather
than values changing.

## The migration was already running

The strongest evidence that this was the right shape: the typography stylesheet
came out **byte for byte identical**. Eighty-five fields in the typography
slice changed on disk — roles renamed from `display-1` to `display`, per-device
`desktop`/`mobile` blocks folded into the linked shape, `autoLineHeightRatio`
filled — and the generated CSS did not move at all.

Which makes sense once said out loud: the docs app parses this file on every
build, so it has been reading the migrated shape all along. What changed is
only that the migrated shape is now what is on disk. A file that migrates on
every read is not a file that is up to date; it is a file whose age is being
paid for on every build and is invisible until something needs the new fields.

The colour stylesheet did move, and that is the feature:

```css
--color-border-subtle: color-mix(
  in oklab,
  var(--color-neutral-300) 12%,
  transparent
);
```

## Checks

- `pnpm -r test`: 1143 in `packages/ui`, 30 in `apps/docs`, including the
  byte-for-byte export guard against the regenerated files.
- `workspace-values.spec.ts` gains "a transparent role says how transparent",
  which follows one role from the JSON to the rendered cell and asserts the
  swatch is drawn transparent too. 7 passed. It could not have been written
  before today: there was no transparent role in this repository to assert on.
- `pnpm handover apps/docs/blueprint/reference.workspace.json` builds: 8 files
  and 114 pages, the archive's `blueprint.css` carries the `color-mix` alias
  and its built semantic page says "at 12%".
- Lint at `--max-warnings 0`, types clean in both apps.

## A correction to the previous entry's roadmap note

Stage 5 of the semantic table plan was ticked with a note saying the hover
surfaces had kept solid weights and that this was a departure from the plan.
That was wrong. Every tone carries `surface` at 12/16% and `surface-hover` at
18/22%; there are 17 transparent roles in the seed, not three.

The misreading was of the comment beside the tone table, which argues for the
_weight_ a hover wash sits at — 50/950, about 1.15:1 against the canvas — and
says nothing against giving it an alpha. Corrected in the roadmap.

## Lessons learned

**A generator is not an upgrader.** The script that writes a fixture produces
today's defaults, which is the right answer the first time and the wrong one
every time after, because by then the fixture holds decisions. The upgrade path
is parse, patch, format.

**The roadmap is what caught it.** Nothing in the code says why the display
font is Space Grotesk; a diff resetting it reads like a fixture being
regenerated, which is exactly what it is. The only reason it was not shipped is
that somebody had written down why the font was chosen, in a document a grep
for the font name reaches.

**A fixture that migrates on read has no pressure to be upgraded.** Everything
passed, every page rendered, and the file had been three versions behind for
long enough that two features could not be demonstrated in the app that exists
to demonstrate them.
