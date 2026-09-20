# 2026-09-21 — Tall chrome is not a pill

Roundness on Preview and Overview was the right bind. The leftover was
Astryx chrome that _reads_ a named radius and then paints it on a surface
the name was never for. A 5-row Copy field and a 430px export CodeBlock
both became lozenges the moment `--radius-element` grew — same look as
`--radius-full`, different token.

No extra control. Map the surface to the token that already exists.

## Inspect Copy

Astryx’s own guidance: TextInput for a short string; TextArea default
three rows, not five. Domain helper `previewInspectorCopyField(id)`
returns `"line"` or `"area"`. Buttons, titles, nav labels are a line.
Leads, bodies, blurbs, and the quote are an area.

Both sit in `.copyField`, which forces `border-radius:
var(--radius-element)` on the Astryx wrapper. Full is a pill and does
not belong on a field that can be taller than it is wide.

## Export CodeBlock

`container="card"` is documented as “standalone radius.” Astryx binds
that to `--radius-element`. Element is a button. A tall preview is a
panel. When Roundness moves Element, the export pane follows it and
reads as a capsule.

Unlayered remap in playground and docs `globals.css`:

```css
.astryx-codeblock.card {
  border-radius: var(--radius-container, 12px);
}
```

Not in `packages/ui/src/theme.css`. That file ships to clients. An
`.astryx-*` override is studio/docs chrome, not a design-token export.
The docs app already installs the generated Tailwind file plus the
bridge; it gets the same remap in its own globals.

Typography export uses the same CodeBlock, so one rule covers both
dialogs.

## Repo pass

`--radius-full` is correct on Overview progress, Home capacity,
docs status badges, the Radius studio cast slider, and Astryx
Badge / Avatar / slider thumbs. Dialogs were already
`--radius-container`. Text inputs were already `--radius-element`.
Elevation pads stay `--radius-page`.

Palette and typography studio sheets still hardcode `px` radii. That
is leftover chrome, not this stadium bug. Left alone.

## Checks

- `pnpm lint` at `--max-warnings 0`.
- Vitest: `previewInspectorCopyField` line vs area.
- Playwright `--reporter=line`: Inspect Copy is an INPUT at 8px for
  “Book a walkthrough” and a TEXTAREA at 8px for the quote; Export
  preview CodeBlock is 12px. Each assertion failed once on the old
  surface before the remap.

## Lessons

**Astryx’s radius names are about their components, not ours.** Card
on a CodeBlock means “has a border,” not “use `--radius-container`.”
Measure `getComputedStyle` on the node. The export pane was 8px
(`--radius-element`), not 9999px, and still looked like a pill once
Element grew.

**Do not put Astryx class overrides in the token export.**
`theme.css` is what a client installs. Unlayered app globals beat
StyleX’s one-class rule without leaking `.astryx-codeblock` into
someone else’s file.

**`--radius-full` is not the only way to get a lozenge.** Element on
a 480px-tall box does it too. The test is the box, not the token id.
