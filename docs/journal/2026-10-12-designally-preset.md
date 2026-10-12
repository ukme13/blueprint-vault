# 2026-10-12 — Designally, a preset kept whole

One commit on `feat/designally-preset`.

## Key changes

- **A preset can carry a whole saved workspace** (`snapshot`). A new
  workspace from it is that workspace, renamed, with no edit time carried
  over. It is read through `parseBlueprintWorkspace`, the loader every
  import uses, so a format change migrates it like any saved file.
- **Designally is the first**, the ninth card in New project: Zalando Sans
  Expanded with Poppins and IBM Plex Sans Thai, 17 role groups, a perfect
  fourth on 16px, coral and navy on an anchored neutral, pill controls,
  hand-picked semantics and its own layout uses.
- **Swatches and the details panel read the snapshot.** Details gain
  `sampleFontFamily`, which the gallery's "Aa" now uses for every preset.

## Architectural decisions

- **Snapshot, not inputs.** The preset inputs cannot say two typefaces, a
  custom role-group set, palette anchors, semantic weights or layout uses.
  A lossy preset would have started projects that are not Designally. The
  comment at the top of `presets.ts` names the exception to "inputs, not a
  document", and the docs app's `reference.workspace.json` is the
  precedent.

## Lessons learned

- **Check which file is meant.** The Downloads copy (24 Sep: 10 roles, 3
  uses) was not the one attached (12 Oct: 41 roles, 13 uses).
- **Every-preset tests encode the input model.** A density cap, a phone
  ratio read from the inputs and a named role set each needed a snapshot
  to be its own.

## Checks

- `pnpm lint`; `packages/ui` 1870 and `apps/docs` 65 unit tests. Ignoring
  the snapshot fails the new tests.
- Playwright against a production build: project presets and Home, 24 of 24. The gallery fit check takes a taller window for a fifth row.
