# 2026-09-22 — A starting point for a new project

Home create always produced the same system: violet primary, teal secondary,
Geist Sans at a major third. The New project dialog now offers three starting
points, and the default still produces exactly what it did before.

The brief that started this asked for a `presets/` directory of project
templates "conforming to the `blueprint.workspace.{id}` schema", a manual clean
slate, two starter presets, an import button in the dialog, and persistence
into the library respecting the eight-project cap.

Reading the code first changed most of that.

## Half the brief was already built

Worth recording, because the same trap is easy to walk into again: a brief
written from the outside describes the whole feature, not the part that is
missing.

- `addWorkspace(storage, project, createId)` already took a project, checked
  `LIBRARY_CAPACITY`, minted the id, wrote `blueprint.workspace.{id}` and
  registered it in `blueprint.library.v1`, returning `null` when full. The
  persistence step needed no code at all. The only new thing was which project
  it was handed.
- Create already routed to `/colour`.
- Home already had an "Import project" button with a file input, sharing the
  create path.
- The full-library message already existed.

So the real work was the preset shape, two definitions, the dialog control, and
the tests. The storage key in the brief was right, which is worth saying too:
`blueprint.workspace.{id}` is what `library.ts` writes.

## A preset is inputs, not a document

The brief's phrasing pointed at writing each preset as a whole
`WorkspaceProject`, since that is what gets stored. That would have been the
third instance of this repo's recurring bug.

A workspace has ten slices:

```
palette  semantics  removedSeedRoles  buttonSchemes  spacing
radius   elevation  previewDevices    layout         typography
```

`semantics` is derived from the palette by `semanticsForPalette`. Spacing,
radius, elevation, layout and preview devices all have `default*()` builders.
A preset written out in full would copy every one of them and go stale the
first time a slice gained a field — exactly what happened to
`.agents/AGENTS.md`, and to the CLAUDE.md icon paragraph corrected earlier the
same day.

So `seedWorkspaceProject` grew an optional second argument, and a preset _is_
that argument:

```ts
export function instantiateWorkspacePreset(preset, name) {
  return seedWorkspaceProject(name, preset);
}
```

There is no second assembly path. A slice added to the seed reaches every
preset without anybody editing `presets.ts`. Every existing caller passes only
a name and was unaffected.

The seed was already well shaped for this: `seedPaletteProject` already took
brand hexes as parameters. Only `seedTypographyProject` needed opening up, and
it took an optional `Partial<SeedTypographyInput>` that falls back to the
studio's own values, so a preset never restates a default.

## Colour and type only

`defaultSpacingScale()` and `defaultRadiusScale()` take no arguments.
Parameterising them to serve two presets is a bigger change than this earned,
and a preset that wants denser spacing needs that work first. Saying so in the
type's doc comment is cheaper than someone rediscovering it.

## The presets

| id          | Primary   | Secondary | Type                                |
| ----------- | --------- | --------- | ----------------------------------- |
| `blueprint` | `#7646ab` | `#0f9d8f` | Geist Sans, major third             |
| `editorial` | `#b4532a` | `#3f6f5f` | serif, perfect fourth, 17px         |
| `utility`   | `#2f6f9f` | `#c2456a` | system sans, minor third, ten steps |

`blueprint` carries no overrides at all. The brief asked for the clean slate to
use a neutral baseline instead, which would have changed what every existing
create produces. That is a different decision, so the default stayed as it was
and a test holds it byte-identical to `seedWorkspaceProject(name)`.

The other two avoid violet, since violet is already the default and a preset
that looks like the default demonstrates nothing.

## The full-library message was landing behind the dialog

`create` called `setIsCreateOpen(false)` before `addAndOpen`. Home renders that
error only when the dialog is closed, so refusing a create at the cap put the
explanation behind the dialog the person was still reading. The dialog now
closes only once the add is through.

The "New project" button is already disabled at capacity, so this is the race
and the second-tab case rather than the common one — which is exactly why it
had gone unnoticed.

## Import stayed on Home

The brief asked for an import button inside the dialog. There is already one on
Home, sharing the create path and covered by its own tests. Moving it would
have broken that coverage and duplicated a working flow. Recorded as a
deliberate deviation in `docs/roadmap/project-presets.md` rather than done
quietly.

## Checks

- `packages/ui`: 1137 tests, 16 new.
- Playwright `project-presets.spec.ts` and `workspace-home.spec.ts`.
- Every new assertion seen failing first: against a dropped slice, an ignored
  preset choice, a changed default, and the old dialog-close order.

## Lessons learned

**Read the code before accepting the brief's shape.** Half of what was asked
for existed, and the half that did not was described in a way that would have
produced the wrong design. Twenty minutes of reading changed the task from
"write three workspace documents" to "add one optional argument".

**The test that matters is the one that catches drift.** Asserting that a
preset fills ten slices is weaker than asserting its output survives
`readWorkspaceProject`, the same validation a loaded file goes through. The
second one fails when a future slice gains a required field; the first does
not.

**A binding test whose fallback equals the real value proves nothing.** The
sibling lesson from the rail-motion pass, and it applied again here: to prove
the default preset is the old default, the test compares against
`seedWorkspaceProject` directly rather than against a copy of its values.
