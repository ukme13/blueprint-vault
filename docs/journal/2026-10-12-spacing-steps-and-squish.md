# 2026-10-12 — Large spacing steps, and squish by pairs

Four commits on `feat/spacing-ramp-and-squish`.

## Key changes

- **The ramp reaches 64.** Past 16 the steps offered jump: 20, 24, 28, 32,
  40, 48, 56, 64 (80px to 256px on 4px). A kept one is in the Uses presets
  like any other step.
- **Squish, one ratio for the scale.** Under Base unit on the Scale tab:
  50% (1:2, the default), 60%, 75% or 100%. Any spacing use whose id ends
  in `-y` follows its `-x` partner when the workspace has one, so a pair
  somebody adds (`inset-badge-x` / `-y`) squishes like the built-in control
  insets. `inset-nav-y` has no partner and stays its own.
- **Following and typed frames.** A following frame looks ordinary; a
  typed one is accent with an accent ✕ back to following. A step picked by
  hand is typed too, and its ✕ sits at the field's end, not against the
  chip (`HybridTokenizedInput` shows the ✕ beside a chip now).
- **The row says it is paired** with a link icon beside the lock. Both
  icons explain themselves in an Astryx tooltip and take focus.

## Architectural decisions

- **The squished value is stored in the cell.** Every reader (preview,
  export, table, radius tab) keeps working unchanged. It is a step name
  when it lands on a kept step, so the export still links `--spacing-…`,
  and a px length otherwise.
- **Synced in one place.** Every scale studio write goes through
  `workspaceWithScaleSnapshot`, which recomputes the paired insets; a new
  workspace is synced at seed. The block inset follows the inline one, the
  unit, the density, a preset or a pruned step.
- **A saved workspace moves nothing.** On load, a paired frame whose value
  is not what the squish gives becomes a typed one
  (`adoptSquishOverrides`), so a project saved before squish keeps its
  values; frames that match follow from then on.

## Lessons learned

- **Find the write path, do not assume it.** The first sync went into
  `createScaleHistory.commit`, which the studio stopped using when the
  shared undo history arrived (#179). The e2e test showed it.
- **Copy-by-field drops new fields.** The scale write's `cloneSpacing` and
  the stored-spacing reader named their fields one by one; the squish was
  lost on every save until both named it.
- **A check that measures the wrong box passes forever.** The ✕-position
  check first measured the ✕'s own wrapper; it now measures the field and
  fails by 80px without the fix.
- **`next build` typechecks the e2e folder.** A throwaway spec with a type
  error stopped the test server from starting.

## Checks

- `pnpm lint`; `packages/ui` 1882 and `apps/docs` 65 unit tests, break-checks
  on the write path, typed frames and the spacing copy.
- Playwright against a production build, full suite: 729 of 730; the one
  failure is accessibility-sandbox's "goes into a container for its text",
  which fails the same way locally on runs without this work and is green
  on CI.
- The last commit's targeted run, under a load average of 19: 56 of 60;
  four Scale-tab tests timed out that do not render the changed row and
  passed on the run before. Not retried.
