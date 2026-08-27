# Typography system rework

## Goal

One typography model for the whole workspace: many fonts, roles the user can add
and group, per-role control, and sizes that land on whole pixels.

This supersedes the role model in `typography-studio.md`. Stages 4 and 5 of
`typography-preview-and-units.md` still stand and are unaffected.

## The problem

There are two typography models in the repo, and they disagree.

|                     | `TypographyStudio`                | `FerreTypographyStudio`         |
| ------------------- | --------------------------------- | ------------------------------- |
| Fonts               | one `fontFamily` string           | `fonts[]`, named                |
| Roles               | fixed six                         | arbitrary, with `group`         |
| Per-role font       | no                                | yes, `fontFamilyId`             |
| Add or remove roles | no                                | yes                             |
| Sizes               | generated from a ratio            | authored by hand                |
| Storage key         | `blueprint.typography-project.v1` | `blueprint.ferre-typography.v1` |

The desired flow matches the Ferre model, so that is the one to keep. The main
studio contributes the part Ferre lacks: sizes generated from a base and ratio.

**They differ in origin, not only in shape.** Ferre's sizes are authored; the main
studio's are derived from a scale. The merged model has to hold both, because the
flow is "generate a scale, then tweak individual roles".

## Which studio survives

**Keep `TypographyStudio`. Transplant the model into it. `FerreTypographyStudio`
is removed.**

*Decision changed:* the plan originally kept the Ferre preset and redirected its
route. It is now deleted outright — the studio, its route, its stylesheet, its
e2e spec, the preset, `responsive-types.ts`, `responsive-export.ts` and
`migrateFerreSystem`. Nothing in the product needs it.

Two things had to move first. `TypographyTextTransform` lived in
`responsive-types.ts` but is used by the merged model, so it now lives in
`system.ts`. And the Ferre preset was the fixture for the multi-font,
authored-size, differing-viewport cases in the export tests; that coverage is
kept through an explicit fixture defined in the test file, so removing the
preset lost no assertions.

They are not peers. The main studio is 711 lines and holds the product surface —
export dialog and units, five validation checks, the creation flow, scale
generation from a base and ratio, preview templates, the resizable panel. The
Ferre studio is 394 lines and holds none of those; what it has is the better data
model: multiple fonts, add and remove roles, groups, per-role desktop and mobile
values, and `textTransform`.

Deleting the main studio would throw away most of the product. Rebuilding the
product inside Ferre would be the same work in a smaller shell.

Three things to carry across rather than drop:

- **The `/typography/ferre` route** becomes a redirect that opens the Ferre preset
  in the main studio, so saved links keep working.
- **Its four e2e tests** — load preset, mobile switching, responsive export, add
  and remove a custom role — cover behaviour that must survive the merge. Rewrite
  them against the main studio; they are the safety net for exactly this
  refactor.
- **The Ferre preset itself.** `Orbitron` plus `Noto Sans Thai` is the only
  working example of the bilingual case in the repo. It must stay reachable.

The main studio gains desktop and mobile per-role values and `textTransform`,
neither of which it has today.

## The merged model

A role links to a generated step _or_ carries its own values:

```ts
interface TypeRole {
  id: string; // "h1", "body-1", "button"
  name: string;
  group: TypeRoleGroup;
  element: string; // semantic tag, see below
  fontId: string; // which font stack
  fontWeight: number;
  textTransform: TypographyTextTransform;
  /** Step in the generated scale. Null when the size is hand-set. */
  step: number | null;
  /** Used when step is null, and always for line-height and spacing. */
  desktop: TypeRoleValue;
  mobile: TypeRoleValue;
}
```

Tracking `step` rather than copying the size is what lets the ratio keep driving
the roles that have not been overridden. Changing the base size should move them;
it must not silently undo a deliberate override.

### Groups

Groups exist so the list stays legible as roles are added:

| Group      | Roles                                    |
| ---------- | ---------------------------------------- |
| Display    | `display`, and more if added             |
| Heading    | `h1`…`h6`                                |
| Subtitle   | `subtitle-1`…`subtitle-3`                |
| Body       | `body-1`…`body-3`                        |
| Supporting | `label`, `button`, `caption`, `overline` |

Adding to a group appends the next index. Nothing is fixed: a project can have
one heading or nine.

### Element is explicit, not inferred

Each role stores its semantic element rather than having it guessed from the id.
Inference breaks immediately: both `display` and `h1` would want `h1`, which is
the two-page-titles bug already fixed once in `roles.ts`.

Default the element from the id when a role is created (`h2` → `h2`, `body-1` →
`p`, `caption` → `small`), then let it be changed. The preview templates from
Stage 3 read this field.

## Fonts

`fonts[]` stays, with each entry becoming a **stack** rather than a single family.

```ts
interface TypeFont {
  id: string;
  name: string;
  families: string[]; // ordered; first that has the glyph wins
  source: "google" | "local" | "system";
}
```

**Bilingual support needs no glyph detection.** CSS font fallback already works
per glyph: with `families: ["Orbitron", "Noto Sans Thai"]`, Latin renders in
Orbitron and Thai in Noto Sans Thai, because Orbitron has no Thai glyphs. The two
behaviours wanted are therefore:

- _Replace everything_ — set `families` to one entry.
- _Latin primary, other scripts secondary_ — order the stack.

### Loading Google fonts at runtime

**Decision taken: the Google Fonts CSS API, injected at runtime.**

`next/font` cannot do this. Its own documentation is explicit — "CSS and font
files are downloaded at build time and self-hosted" — and it is a static import,
so the family has to be known when the app is built. A picker over the whole
Google catalogue is therefore incompatible with it.

Consequences to accept and state in the UI:

- The reader's browser makes requests to `fonts.googleapis.com` and
  `fonts.gstatic.com`. This is a privacy and offline regression against the
  current self-hosted setup, and it applies to the studio only, not to exported
  tokens.
- Exported CSS names families but cannot embed them. The export needs a comment
  listing the Google families used, so the consuming app can load them itself.
- Thai coverage varies by family. The picker must show which families support
  Thai, or a bilingual project will silently fall back to a system font.

The family list needs `subsets` metadata to do that filtering. The Google Fonts
Developer API needs a key, so start from a checked-in snapshot of family names
and subsets, and treat live querying as a later improvement.

### Uploaded fonts

Deferred to its own stage. A base64 font is often 1–3MB and `localStorage` holds
roughly 5MB of string, so two uploads can make a project unsaveable. This needs
IndexedDB or a session-only lifetime, and that decision should not hold up the
rest.

## Rounding

**Decision taken: whole pixels by default, with optional snapping to 2, 4 or 8.**

A modular scale produces decimals by definition, so rounding means the ratio
becomes a guide rather than a law. That is the intent, but it should be visible:
show the exact value alongside the rounded one so the drift is never a surprise.

Rules:

- Round at scale generation, so every consumer sees the same number.
- Apply identically to desktop and mobile.
- Never round below the minimum body size the validation already enforces.
- Line-height stays a unitless multiplier and is never rounded to pixels.

## Stages

1. ✅ **Model and migration.** Merge the two shapes, add `element`, `step`, and font
   stacks. Migrate both storage keys forward. No new UI.
2. ✅ **Role editor.** Groups, add and remove, per-role element, font, weight,
   line-height and spacing.
3. **Rounding.** Whole-pixel default, optional 2/4/8 snapping, exact value shown.

### Notes from stages 1 and 2

The storage key was **not** versioned. `readStoredProject` detects which shape is
stored — the pre-merge one has `roleStyles`, the merged one has `system` — so no
saved project is orphaned by the rename.

Editing a size by hand sets `step: null`, which unlinks that role from the scale.
That is the mechanism behind the rule above: the ratio keeps driving everything
else and never reverts the value someone set.

A new role starts unlinked and copies a sibling's size, rather than claiming a
step that already belongs to another role.

Preview templates ask for roles by name, but an arbitrary system may not have the
one a template wants. `styleForRole` falls back id → group → body → first role, so
a template can never render unstyled.

The `FerreTypographyStudio` retirement is **not** part of stage 2. The main studio
now runs on the merged model while Ferre still runs on its own; both work, and
retiring it is a separate change so this one stayed reviewable. 4. **Google font picker.** Runtime loading, Thai-capable filtering, privacy note. 5. **Uploaded fonts.** Only once storage is settled.

## Migration

Two persisted projects exist and both must survive:

- `blueprint.typography-project.v1` — six fixed roles, one font. Map each role to
  the merged shape, keep `step`, wrap the single family in a one-entry stack.
- `blueprint.ferre-typography.v1` — already close. Add `element` from the id,
  `step: null` because its sizes are authored.

**Correction to an earlier claim: token names do not change.** The old export
emits `--font-{role}-size` for the six fixed role names, and the merged export
emits `--font-{role.id}-size`. Migrating the six roles keeps their names as ids,
so `--font-body-size` stays `--font-body-size`. The step tokens
`--font-size-{n}` must keep being emitted as well; the Ferre export does not
emit them today and would drop them silently.

## Effect on work in flight

- **#24, units.** Model-agnostic. Unaffected.
- **#25, preview templates.** The role to element mapping in `roles.ts` becomes a
  _default generator_ for new roles rather than a fixed table, since `element`
  moves onto the role. Templates keep working: they ask for a role and get
  resolved CSS. The single-`h1` rule survives as a validation warning rather than
  a hard mapping.

Neither needs to be held back.

## Safety and quality rules

Changing the base size or ratio must move only roles still linked to a step. A
hand-set size is a decision and must not be silently reverted.

Rounding must never push body text below the minimum the validation enforces.

A project must never be left unsaveable. If a font cannot be stored, say so at
the point of upload rather than failing the next save.

The studio may load fonts from Google, but exported tokens must stay portable:
names and comments only, never a hidden runtime dependency.

## Definition of done

1. One model backs both studios, and both old storage keys migrate without loss.
2. A user can add and remove roles within Display, Heading, Subtitle, Body and
   Supporting groups.
3. A user can set the element, font, weight, line-height and spacing per role.
4. A user can define a font as an ordered stack and see Latin and Thai resolve to
   different families in the preview.
5. A user can pick any Thai-capable Google font and see it applied live.
6. Generated sizes are whole pixels, optionally snapped to 2, 4 or 8, with the
   exact value still visible.
7. Changing the ratio moves scale-linked roles and leaves overridden ones alone.

Model, migration and rounding functions need unit tests. Role editing, font
stacking, the Google picker and rounding each need Playwright coverage.
