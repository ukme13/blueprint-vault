# 2026-09-11 — Group auto line-height ratios

Follow-on to auto leading. The five group ratios were a lookup table keyed by
id, so Display 1.1 / Headings 1.2 / Body 1.5 / Label 1.3 / Caption 1.4 could
not be changed without editing source. They now live on `TypeGroup`.

## Model

`TypeGroup.autoLineHeightRatio` is required. `defaultGroups` seeds the table
above. A custom group starts at body's 1.5. `updateGroup` clamps to the same
1–2.5 range a role ratio uses. Old files without the field get the seed for
that id on read.

`auto` still means "group ratio × current size, snap up to the 4px grid".
Changing the group field does not move a role that has already pinned a ratio
or a pixel height.

The Groups tab puts a number field beside the name, with a line-height icon
in the start slot. The unused `.roleGroupMeta` / `.roleGroupActions` tracks
were wired for this: name, ratio, indexing on one grid, so the name still
shrinks at 320.

## Refactor

`resolveLineHeight` takes the system, not a loose groups array, and looks up
the role's group the same way `resolveRoleSizePx` already takes the system.
`readStoredAutoLineHeightRatio` stays in migrate — it is JSON hydration, not
resolution. The inspector role row is its own file so the group card stays
under a readable length.

## Roadmaps

`typography-studio.md` records the stored group ratio. A configurable rem
root and extra templates remain.

## Checks

- Vitest `system`, `migrate`, `line-height`, `system-export`, `role-rows`,
  `fluid`.
- Playwright `typography-line-height.spec.ts` — Body's group field is 1.5;
  changing it to 1.8 leaves a pinned body alone and feeds auto (placeholder
  32).

## Lessons

**A seed table is not a setting.** Looking up `AUTO_LINE_HEIGHT_RATIOS[groupId]`
at resolve time meant an edited group still exported the number from source.
Storing the ratio on the group, and passing the system into `resolveLineHeight`,
is the same rule size already had: the model is what you are looking at.

**Pinned leading is a decision.** Auto following the group is the point of
auto. A typed 1.5 on body is not a default that went stale; overwriting it
when the group field moves would be the migration bug this field exists to
avoid.
