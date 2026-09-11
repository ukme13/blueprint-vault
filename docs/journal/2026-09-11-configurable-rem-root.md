# 2026-09-11 — Configurable rem root

`rem` always divided by 16. A scale with an 18px body is supposed to ship as
`1.125rem`, and that is still the default. Some teams set `html { font-size }`
to something else (the 62.5% / 10px trick, or 18px to match their body).
Those files were lying: 16px of type still said `1rem`.

## Model

`remRootPx` lives on `TypographyProjectData` next to `unit`. Sizes stay in
px. Conversion stays at preview and export. A missing field on an older save
is 16. The field clamps to 10–24 so a corrupt file cannot divide by zero or
by 96.

The CSS does not write `html { font-size }`. Rem exists so the reader's
browser setting still works; setting the root would freeze it. A non-default
value is a contract, named as a comment:

`/* Lengths in rem assume html { font-size: 18px }. */`

Spacing rem is unchanged. Colour and scale CSS are a different file, and
that file still assumes 16.

The system export format button that used to say "Blueprint Workspace" is
now "Blueprint". The longer label overflowed the grid cell.

## Roadmaps

`typography-preview-and-units.md` Stage 7. Extra templates remain on later.

## Checks

- Vitest `export`, `system-export`, `fluid`, `workspace`, `workspace-file`.
- Playwright `typography-export.spec.ts`, `workspace-file.spec.ts`.

## Lessons

**Do not emit `html { font-size }` from a token file.** That would be the
studio deciding the reader's root. A comment is the honest form of a
non-default rem root: whoever installs the file opts in.
