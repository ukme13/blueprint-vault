# 2026-09-22 — Alpha reaches the documentation tables

Stage 6 of the semantic table plan, the half that had not landed: the studio
has understood transparent references since the alpha model went in, and the
documentation app never learned to say so.

## What was actually wrong, and what was not

The first telling of this was too strong. It said the handover archive ships
wrong values today — that a client opening the foundation pages is told
`border.subtle` is a solid shade. That is not true, and the reason is worth
recording because it is the same reason the gap survived this long.

`apps/docs/blueprint/reference.workspace.json` is **version 5**. Alpha is what
moved the file format to 6. The reference workspace predates the feature, has
no alpha anywhere in it, and stores `border.subtle` as a flat `neutral 300`.
So the pages built from it are accurate: they describe a system with no
transparency in it, and there is none.

What was wrong is narrower and still worth fixing. `pnpm handover` is
parameterised — point it at a client's workspace and the same pages describe
their system. The seed has set alpha on `border.subtle`, `fg.disabled` and
`surface.overlay` since that stage landed, so **any** workspace saved out of
the studio today carries it. The pages had no way to render it. The failure
was waiting on the first real client file rather than sitting in the repo,
which is the kind that gets found late and by somebody else.

## The contrast table's numbers were already right

Worth checking before changing: `ContrastTable` runs `assessTextChecks`, and
`preview-assessment.ts` composites a transparent token over its ground before
measuring. The ratios on that page have been correct the whole time.

What was short was the sentence beside them. A row said `neutral 450 on
neutral 50` while the number had been taken from the composite, so a reader
following the two named shades to a colour picker would get a different ratio
back and have no way to see why.

So the swatches in that table stay solid, deliberately, and now carry a
comment saying so. They show what was measured. The checker belongs in the
semantic table, where the cell is naming the reference itself.

## One spelling for a percentage

`describeReference` went into `packages/ui/src/color/token-rows.ts` beside
`resolvedRoleReference`, which gained the `alpha` it had been dropping. It
writes `neutral 450` for an opaque reference and `neutral 450 at 12%` for a
transparent one, through `alphaPercent` — the same function the CSS export,
the Tailwind export and the report's wording already use, which is what keeps
a token written as 12.5% in one from being 0.125 in another.

The long form stays in `describeSemanticContrast`: what a colour was laid over
and what came out. A contrast row has to be re-derivable. A table cell naming
a reference does not, because the surface it sits on is the row it is in.

`token-rows.ts` had no tests before this. Every export was reached through a
page, and a page is exactly where a dropped field is invisible.

## Checks

- `pnpm -r test`: 1143 in `packages/ui`, 30 in `apps/docs`.
- Four new assertions seen failing first — against the formatter with its alpha
  branch removed, against `resolvedRoleReference` hardcoded to opaque, and
  against the old table cell, which failed both the percentage test and the
  checker test.
- Lint at `--max-warnings 0`, types clean in both apps, Prettier clean.
- `workspace-values.spec.ts` on the docs app passes, and proves nothing about
  this change: the reference workspace has no alpha, so the rendered page is
  byte-identical either way. The unit tests are the cover here.

## Still open

**The reference workspace should probably be regenerated at version 6.** While
it stays at 5 the documentation never renders a transparent role, so this code
path has no page exercising it and the next person to break it will not find
out from the docs app. Regenerating changes the committed export under
`app/blueprint/`, which `docs-export.test.ts` compares byte for byte, and it
changes what the published pages say — so it is its own change with its own
argument, not a line in this one.

## Lessons learned

**A deliverable parameterised by a file is only ever exercised by the file you
point it at.** Every test passed, every page looked right, and the feature was
missing — because the one workspace in the repository predates it. The
question to ask of a template is not "does it render" but "what does the
fixture not contain".

**Check whether the thing is broken before fixing it.** The contrast ratios
were composited correctly the whole time; only the wording was short. A fix
written from the first diagnosis would have changed a number that was already
right, and the test would have been rewritten to match it.

**A percentage formatter is domain logic.** It looks like presentation, it
lives one import away from a component, and the moment there are two of them a
token is 12.5% on one page and 0.125 on another. `alphaPercent` already said
this about itself in a comment; the useful part was reading it.
