# Workspace project merge plan

## Goal

Give the two studios one project, so typography can read the palette the user
actually made. Today they are two unrelated documents that happen to live in the
same browser.

This exists because of Stage 4 of
[typography-preview-and-units.md](typography-preview-and-units.md) — "preview
against the real palette" — which cannot be built at all until there is a
"real palette" for the typography studio to reach. It is written as its own plan
because the storage change is larger than the feature that needs it, and because
it will outlive that feature.

## Why now

Stage 4 wants preview text and background chosen from the project's palette
tracks and shades. There is no shared project to choose from:

- `blueprint.palette-project.v1` holds `PaletteProjectData` — `name`, `tracks`,
  `lightnessPattern`, `lightnessValues`.
- `blueprint.typography-project.v1` holds `{ system, unit, specimenText,
template }`.
- `blueprint.colour-format.v1` holds a bare format string.

The two studios are separate routes (`app/page.tsx` and
`app/typography/page.tsx`) that load, validate and persist independently and
share nothing.

The alternative — typography reads the palette key directly, read-only — was
considered and rejected as the long-term answer. It is a shortcut worth
remembering if this plan stalls, because it unblocks Stage 4 on its own.

## What exists today

Worth stating plainly, because three of these constrain the design.

**Two names, both editable.** The palette topbar edits `project.name`. The
typography topbar edits `system.name`. They are different fields on different
documents and nothing keeps them in step.

**Detect, do not version.** `readStoredProject` in `typography-project.ts`
already recognises two historical shapes — a flat pre-merge one with
`roleStyles`, and a merged one — and picks by inspecting the value rather than
reading a version number. The comment there says why: so no saved project is
orphaned by a rename. `normalizeStoredSystem` then backfills every field the
model has since added. This plan continues that approach rather than
introducing a version gate.

**One file format, and it is the palette's.** Import and export use
`{ kind: "blueprint-palette", version: 1, project }`, parsed by
`parseBlueprintPaletteProject`. Typography has no project file at all — its
export dialog emits CSS and Tailwind, not a document you can load back.

**No cross-tab reconciliation.** Nothing anywhere listens for the `storage`
event. This is currently harmless and will stop being harmless; see the hazard
below.

## The hazard this creates

Today each studio writes only its own key, so two open tabs cannot destroy each
other's work. Merging into one key removes that separation.

A typography tab that persists the whole workspace will overwrite palette edits
made in another tab, because its in-memory copy of the palette is whatever it
read at load. The user sees colour work vanish with no error. This is the single
biggest risk in the plan and the reason it is staged the way it is below.

Three ways to handle it, in the order I would try them:

1. **Write your own slice only.** Persisting re-reads the stored workspace,
   replaces just the slice the studio owns, and writes the result back. Narrows
   the window to a single write rather than a whole session. Cheap, and worth
   doing regardless of what else is chosen.
2. **Reconcile on `storage`.** Each studio listens and takes the other slice
   when it changes underneath. Removes the stale-read window in practice.
3. **Keep the write granularity per slice.** One workspace concept in the code,
   two storage keys underneath. Gets most of the architecture with none of the
   clobbering. Less elegant; the honest fallback if 1 and 2 prove fiddly.

Whichever is chosen, a test has to open two contexts and prove the second does
not eat the first. That case does not exist yet.

## Proposed schema

```ts
interface WorkspaceProject {
  /** One name for the workspace. Both topbars edit this. */
  name: string;
  /** Absent until the studio has been used, rather than defaulted. */
  palette: PaletteProjectData | null;
  typography: TypographyProjectData | null;
}
```

Two points that are decisions rather than details.

**`name` is unified.** Both topbars edit one field. This is a visible change:
someone with a palette called "Brand" and a scale called "My type scale" will
find both reading the same thing afterwards, and the migration has to choose
which name survives. The alternative — a workspace name plus two slice names —
keeps three names for one document, which is worse to explain than the one-off
surprise.

**Slices are nullable, not defaulted.** A user who has only ever opened the
palette has no typography slice, and must still land on the typography creation
screen rather than a fabricated default scale. `null` says that; an empty
`TypeSystem` does not.

`PaletteProjectData` keeps its `name` field for now, since
`parseBlueprintPaletteProject` and the export file both use it. Removing it is a
separate cleanup.

`blueprint.colour-format.v1` **stays where it is.** It is a per-device display
preference, not part of the document — the same reason `previewWidth` and
`previewLang` are component state rather than project fields.

## Migration plan

Read order, on either studio's load:

1. `blueprint.workspace.v1`. If present and recognisable, use it.
2. Otherwise build one from whichever legacy keys exist — palette, typography,
   both, or neither — running each through the validator it already has
   (`readStoredProject` for palette, `normalizeStoredSystem` and
   `migrateLegacyProject` for typography). Both of those already handle their
   own historical shapes, so this composes rather than replaces them.
3. Write the result to the new key. **Leave the legacy keys in place.**

Step 3 is deliberate. Keeping the old keys for one release means a user who hits
a bug can be told to clear one key rather than losing their work, and it makes
the migration reversible without a backup step. A later release deletes them.

Name resolution when both exist: take the palette's, since that studio is the
default route and more likely to be the one someone named. Record the
typography name in the same commit that drops it, so it is recoverable from
git if the choice turns out wrong.

## Stages

1. ✅ **Schema and migration, no UI.** `workspace-project.ts` in `packages/ui`:
   the type, a reader that composes the two existing validators, a writer, and
   the legacy-to-workspace migration. Unit tested against every combination —
   neither key, palette only, typography only, both, and each legacy typography
   shape. Nothing consumes it yet.
2. ✅ **Palette studio onto the workspace,** writing its slice only.
3. ✅ **Typography studio onto the workspace,** same. After this the legacy keys
   are written by nobody.
4. ✅ **One name, both topbars.** Until this lands the workspace name is written
   by whichever studio saved last, since each still edits its own project
   name. Invisible while nothing displays it, and wrong the moment anything
   does. Each studio adopts the workspace name on load and writes it back on
   rename, so the two converge rather than taking turns. The slice names stay
   — the palette file format and the typography export both read them — but
   they follow the workspace name rather than diverging from it.

   This is the one user-visible regression in the plan: a palette called
   "Brand" and a scale called "My type scale" become one name, and the
   migration has already chosen which.

5. ✅ **Cross-tab safety.** Slice-only writes turned out to be enough for the
   slices — the re-read before every write covers them — but not for the name,
   which is not a slice. A tab adopts the name at load, so its copy goes stale
   the moment the other tab renames, and it was writing that copy back. A
   studio now sends a name only when it is the one that changed it. The
   `storage` listener was not needed and was not added.
6. ✅ **File format.** `{ kind: "blueprint-workspace", version: 1, project }`,
   with `blueprint-palette` files still importable into the palette slice.
7. **Then Stage 4** of the preview plan, which is now a small feature.

Stage 1 is the whole risk. It is pure, testable, and lands with no user-visible
change, which is the point.

## Safety and quality rules

Every project saved before this work must still load, including both historical
typography shapes. This is the rule the plan exists to keep, and it is the one
worth a test per case rather than a test per stage.

No storage-key version gate. Detection by shape, as the typography reader
already does.

The migration runs at most once per browser and is idempotent — running it twice
must produce the same workspace, since step 3 leaves the legacy keys readable.

A studio must never write a slice it does not own.

Starting a new project in one studio must not clear the other's slice. Today
"New project" removes a whole key; after this it clears one slice.

## Definition of done

1. A user with only a saved palette opens either studio and finds their palette
   intact and the typography creation screen.
2. A user with only a saved scale finds the reverse.
3. A user with both finds both, under one name.
4. A user with either historical typography shape is migrated as before.
5. A user with nothing saved gets the creation screen in both studios.
6. Two open tabs cannot destroy each other's slice.
7. A `blueprint-palette` file still imports.
8. Clearing `blueprint.workspace.v1` and reloading rebuilds it from the legacy
   keys, unchanged.

## Open decisions

These change the shape of the work and are not mine to settle. The name
question was settled: unified, taking the palette's when both exist.

- **When do the legacy keys get deleted?** The plan says a later release, which
  needs a release to point at.
