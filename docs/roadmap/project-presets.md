# Project presets on the Home create dialog

## What this is

Home create always produces the same system: the Blueprint seed, violet primary
and teal secondary, Geist Sans at a Major Third. This adds a choice of starting
point to the New project dialog, without changing what the default produces.

## What already exists, and is therefore not in scope

Half of the original brief is built. Naming it here so nobody rebuilds it.

- **Persistence.** `addWorkspace(storage, project, createId)` in
  `workspace/library.ts` already takes a project, checks `LIBRARY_CAPACITY`,
  mints the id, writes `blueprint.workspace.{id}`, and registers it in
  `blueprint.library.v1`. It returns `null` when the library is full. Nothing
  changes here. The only new thing is which project it is handed.
- **Routing.** Create already lands on `/colour`.
- **Import.** Home carries an "Import project" button with a file input for
  `.json` and `.blueprint.json`, and it shares the create path. It stays on
  Home. Moving it into the dialog would break its own coverage and duplicate a
  working flow for no gain. This is a deliberate deviation from the brief.
- **The full-library message.** `addAndOpen` already sets "This browser holds 8
  projects. Delete one to add another." What is wrong is _where it lands_. See
  below.

## The preset shape

A preset is **inputs, not a document**. The temptation is to write each preset
as a whole `WorkspaceProject`, since that is what gets stored. Do not. A
workspace has ten slices, and most are derived or defaulted:

```
palette  semantics  removedSeedRoles  buttonSchemes  spacing
radius   elevation  previewDevices    layout         typography
```

`semantics` comes from `semanticsForPalette(palette)`. Spacing, radius,
elevation, layout and preview devices all have `default*()` builders. A frozen
preset document would copy all of that and go stale the first time a slice
gains a field, which is the failure this repo has already had twice, in
`.agents/AGENTS.md` and in the CLAUDE.md icon paragraph. A preset that carries
only what it changes inherits every future slice for free.

So, in `packages/ui/src/workspace/presets.ts`:

```ts
// seed-project.ts
type SeedWorkspaceInput = {
  primarySeedHex?: string;
  secondarySeedHex?: string;
  typography?: Partial<SeedTypographyInput>;
};

// presets.ts
type WorkspacePreset = SeedWorkspaceInput & {
  id: string;
  name: string;
  summary: string;
};
```

`seedWorkspaceProject` grows an optional second argument of exactly
`SeedWorkspaceInput`, so a preset _is_ the argument and there is no second
assembly path to keep in step:

```ts
export function instantiateWorkspacePreset(preset, name) {
  return seedWorkspaceProject(name, preset);
}
```

Every existing caller passes only a name and is unaffected.

Colour and type only. `defaultSpacingScale()` and `defaultRadiusScale()` take
no arguments, and giving them some to serve two presets is a bigger change than
this earns. A preset that wanted denser spacing would need that work first.

## The presets

| id          | Name           | Primary   | Secondary | Type                               |
| ----------- | -------------- | --------- | --------- | ---------------------------------- |
| `blueprint` | Blueprint seed | `#7646ab` | `#0f9d8f` | Geist Sans, Major Third            |
| `editorial` | Warm editorial | `#b4532a` | `#3f6f5f` | Serif, Perfect Fourth, 17px        |
| `utility`   | Cool utility   | `#2f6f9f` | `#c2456a` | System sans, Minor Third, 10 steps |

`blueprint` carries no overrides at all. It is the existing default, so it is
also the clean slate the brief asked for, and keeping it as-is means create
behaviour does not change for anyone who ignores the new control. The brief
asked for a neutral baseline instead; that would change what every existing
create produces, which is a different decision and not this one.

The other two avoid violet and differ from each other in hue and in type, so
the control demonstrates something on first use.

## The dialog

`NewProjectDialog` currently renders a static line reading "Preset: Blueprint
seed". That becomes an Astryx `RadioList` of the three presets, each
`RadioListItem` carrying the summary as its description and three seed swatches
as `endContent`.

Swatches render the preset's seed hexes directly. They do not instantiate a
workspace, because building three systems to paint nine squares on every
keystroke is absurd.

**Selectors that must not change**, because the shared e2e helper and most
specs reach a studio through them:

- the dialog's accessible name, `New project`
- the field label, `Project name`
- the submit button, `Create workspace`

## The full-library fix

`create` calls `setIsCreateOpen(false)` before `addAndOpen`. When the add fails
the dialog is already gone, and the message renders on the page behind it,
because Home only shows that error when the dialog is closed. Close the dialog
_after_ a successful add instead, so a refused create explains itself where the
person is looking. The "New project" button is already disabled at capacity, so
this is the race and the second-tab case rather than the common one.

## Tests

Vitest, in `packages/ui`, because that is where the logic lives:

- every preset instantiates a project with all ten slices filled
- a preset's output survives `readWorkspaceProject`, the same validation a
  loaded file goes through, which is the check that catches drift
- the primary and secondary seeds land on the right tracks
- typography overrides reach the system: family, ratio, step count
- `blueprint` instantiates byte-identical to `seedWorkspaceProject(name)`, so
  the default cannot drift
- an unknown id resolves to nothing rather than to a wrong preset

Playwright, one spec, on the existing preview of the create flow:

- choosing a preset creates a workspace whose palette carries that preset's
  primary
- at capacity, submitting keeps the dialog open and shows the message inside it

Per CLAUDE.md, each new assertion is seen failing once before it is trusted.
