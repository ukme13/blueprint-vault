# Dependency upgrade plan

## Goal

Move the workspace from its current pinned versions to the latest stable
releases, without breaking the palette engine, the typography studio, or the
Astryx-based UI.

Versions below were checked against the npm registry on 2026-08-27. Re-check
with `npm view <pkg> version` before starting, because these move weekly.

## Rules for this work

- One stage per branch. One stage per PR. Never mix a patch sweep with a major
  bump.
- After every stage: `pnpm install`, `pnpm lint`, `pnpm check-types`,
  `pnpm test`, `pnpm build`. All five must pass before merging.
- Run `pnpm --filter playground test:e2e` after any stage that touches React,
  Next, Tailwind, or Astryx.
- Commit the updated `pnpm-lock.yaml` with each stage.

## Stage 0 — Node and pnpm floor

Do this first. Everything else installs on top of it.

| Item             | Current      | Target         |
| ---------------- | ------------ | -------------- |
| `engines.node`   | `>=21.7.0`   | `>=22.13.0`    |
| `packageManager` | `pnpm@9.0.0` | `pnpm@11.24.0` |

Node 21 is end-of-life and should not be an allowed floor. Local Node is
already 24.18.0, and CI was moved to Node 22 in commit `2ea5d71`, so raising the
floor matches what is actually being used.

pnpm 9 to 11 is two majors. Expect lockfile format changes, so the whole
lockfile will be rewritten. Review that diff on its own, not mixed with package
changes.

Check `.github/workflows` still pins a Node version that satisfies the new
floor. `pnpm/action-setup@v4` is unpinned there, so it reads `packageManager`
and follows this bump automatically.

### What actually happened

- The floor is `>=22.13.0`, not `>=22.12.0`. pnpm 11.24 requires `>=22.13` and
  ESLint 10.9 requires `^22.13.0`, so 22.12 would have been too low.
- The lockfile did **not** get rewritten. It stayed at `lockfileVersion: 9.0`
  and pnpm 11 read it unchanged.
- pnpm 11 refuses to purge `node_modules` without a TTY. Non-interactive runs
  need `CI=true`.
- pnpm 10+ blocks dependency build scripts by default. Install wrote an
  `allowBuilds` placeholder into `pnpm-workspace.yaml` for `sharp`, which had to
  be resolved by hand. Set to `true`: sharp's install script is
  `node install/check.js || npm run build`, which is a no-op check when the
  `@img/sharp-*` prebuilts are present, and Next needs sharp for image
  optimization.

**Risk:** medium. Isolated. Lower than expected, since the lockfile survived.

## Stage 1 — Patch and minor sweep

Low risk. These are all same-major bumps. Do them together in one commit.

| Package                            | Current | Target        |
| ---------------------------------- | ------- | ------------- |
| `next`                             | 16.2.0  | 16.3.3        |
| `react`, `react-dom`               | 19.2.0  | 19.2.8        |
| `@types/react`, `@types/react-dom` | 19.2.2  | latest 19.2.x |
| `tailwindcss`                      | 4.3.2   | 4.3.3         |
| `@tailwindcss/postcss`             | 4.3.2   | 4.3.3         |
| `postcss`                          | 8.5.16  | 8.5.26        |
| `prettier`                         | 3.7.4   | 3.9.6         |
| `turbo`                            | 2.10.4  | 2.10.12       |
| `vitest`                           | 4.1.10  | 4.1.11        |
| `typescript-eslint`                | 8.50.0  | 8.68.0        |

`next` is pinned exactly (`"next": "16.2.0"`, no caret) in both apps. Update the
literal string in each app's `package.json`.

Prettier 3.7 to 3.9 can change formatting output. Run `pnpm format` as its own
commit inside this branch so the reformat noise is separable from the version
bump.

Already at latest, nothing to do: `@playwright/test` 1.62.1,
`class-variance-authority` 0.7.1.

### What actually happened

- `@next/eslint-plugin-next` (16.2.0 → 16.3.3) and `eslint-plugin-turbo`
  (2.7.1 → 2.10.12) were moved here from Stage 3. Both are same-major bumps that
  should track `next` and `turbo`, and lint still passes at `--max-warnings 0`.
- `@types/node` went 22.15.3 → 22.20.1, staying on 22.x to match the Node floor.
- `globals` was **not** bumped. Latest is 17.x, which is a major, so it stays for
  the ESLint stage.
- `pnpm install` needs `--no-frozen-lockfile` when manifests change. With
  `CI=true` set, frozen is the default and the install fails by design.
- Prettier 3.9 reformatted 12 files. The change is cosmetic: short union types
  now collapse onto one line where they fit.

**Risk:** low.

## Stage 2 — Astryx 0.1.3 to 0.5.0

This is the big one. Four minor versions on a pre-1.0 package, where minor
versions are allowed to break.

Packages to move together, all pinned to the same version:

- `@astryxdesign/cli`
- `@astryxdesign/core`
- `@astryxdesign/theme-neutral`

Steps:

1. Read the real changelog at `github.com/facebook/astryx` releases. Do not
   trust any blog URL that has not been opened.
2. Bump all three, then run `pnpm exec astryx upgrade --apply`, which is the
   documented post-bump codemod.
3. Run `pnpm exec astryx component --list` and diff against the current 149
   components. Find anything renamed or removed.
4. Fix call sites. Every prop that changed needs `astryx component <Name>`
   checked against the new version.
5. Confirm `reset.css` and `astryx.css` import paths did not move.
6. Update the Astryx block in `CLAUDE.md`: version number, component count, and
   any CLI command that changed.

Watch for: the `@stylexjs/stylex` peer, currently resolved at 0.18.3, may need a
matching bump. Theme token names may have shifted, which would collide with the
OKLCH token grid in `packages/ui/src/theme.css`.

Visual check on the playground before merging. Type-checks passing is not
enough for a UI library upgrade.

### What actually happened

This stage was far smaller than budgeted. Almost every risk above turned out not
to apply.

- **No breaking change in this repo touched anything.** All 19 codemods, run
  against `apps/playground`, `apps/docs`, and `packages/ui`, reported "no changes
  needed". The breaking changes across 0.1.4 → 0.5.0 land on `Avatar`,
  `DropdownMenuRadioGroup`, `TabList`'s `orientation`, Table render-props, and
  the authoring/CLI-JSON surfaces — none of which this repo uses.
- **Theme tokens did not shift.** `theme-neutral` has the same 90 tokens in
  0.1.3 and 0.5.0, none added or removed. Only four values changed
  (`--color-accent-muted`, `--color-border`, `--color-error`,
  `--color-text-secondary`). There is no collision with the OKLCH grid: Astryx
  emits semantic names, ours are numbered `--color-neutral-{25..950}`.
- **No component was removed**, and the count went 149 → 163. The only dropped
  package export is `./astryx.umd.js`, which nothing here imports.
- `@stylexjs/stylex` resolved from 0.18.3 to 0.19.0 on its own. No manual work.
- `astryx upgrade` needs `--from <old-version>`, and its `--path` defaults to
  `./src`, which does not exist in this monorepo. Run it once per source
  directory or the codemods silently do nothing.
- Astryx 0.5.0 added `postinstall` scripts to `core` and `cli`, so pnpm asked for
  another `allowBuilds` decision. Both are set to `false`: the scripts only print
  a "run astryx init" nudge, do no writes and no network, and stay quiet once the
  project has the Astryx marker in its agent docs.
- `astryx upgrade` rewrites the `<!-- ASTRYX:START -->` block in `CLAUDE.md`
  itself, so step 6 above is automatic. Note the guidance tightened: `<div>` for
  layout is no longer permitted. Existing code was not reworked for this.

**One real regression, and it was in a test, not the app.** Astryx 0.5.0 toasts
now also announce through a separate `aria-live` region carrying the same text.
That made an unscoped `getByText("Color copied", {exact: true})` match two
elements and fail Playwright's strict mode. Fixed by scoping the assertion to
the notifications region. This is the kind of thing only e2e catches — lint,
types, unit tests, and build were all green while it was failing.

**Risk in hindsight:** low to medium, not high. The codemod does the work.

## Stage 3 — ESLint 9 to 10

| Package                     | Current | Target      |
| --------------------------- | ------- | ----------- |
| `eslint`                    | 9.39.1  | 10.9.1      |
| `@eslint/js`                | 9.39.1  | 10.x        |
| `eslint-plugin-react-hooks` | 5.2.0   | 7.1.1       |
| `eslint-config-prettier`    | 10.1.1  | latest      |
| `eslint-plugin-react`       | 7.37.5  | latest      |
| `eslint-plugin-turbo`       | 2.7.1   | match turbo |
| `@next/eslint-plugin-next`  | 16.2.0  | match next  |

All shared config lives in `packages/eslint-config`, so the changes are
concentrated in `base.js`, `next.js`, and `react-internal.js`.

`eslint-plugin-react-hooks` jumping 5 to 7 is the part that will produce new
errors. Version 7 lints more aggressively than 5. Both apps run
`eslint --max-warnings 0`, so any new rule becomes a hard failure. Budget time
for fixing hook violations rather than just switching versions.

If it stalls, ESLint 9 has a `maintenance` tag at 9.39.5 as a holding position.

**Risk:** medium to high, driven by the hooks plugin.

### What actually happened

**ESLint 10 is blocked upstream, and we took the holding position.**

`eslint-plugin-react@7.37.5` — the latest stable — declares
`^3 || ... || ^9.7` and does not accept ESLint 10. It is used centrally in both
`next.js` and `react-internal.js`, so it cannot simply be dropped. The only
newer publish is `7.8.0-rc.0`, a prerelease whose peer range is *older*
(`^3 || ^4`), and our own package rules forbid prereleases anyway.

So this stage moved to the newest 9.x instead:

| Package                     | From   | To      |
| --------------------------- | ------ | ------- |
| `eslint`                    | 9.39.1 | 9.39.5  |
| `@eslint/js`                | 9.39.1 | 9.39.5  |
| `eslint-plugin-react-hooks` | 5.2.0  | 7.1.1   |
| `eslint-plugin-only-warn`   | 1.1.0  | 1.2.1   |
| `globals`                   | 16.5.0 | 17.11.0 |

Note `@eslint/js` tracks ESLint's major, so its "latest" is 10.0.1, not 10.9.x.
`globals` 17 is a major, but its only breaking change splits `audioWorklet` out
of `browser`, and the configs use `browser` and `serviceworker` only.

**Both 9.x and 10.x carry an npm deprecation notice.** ESLint marks the whole 9
line "no longer supported", including the `maintenance` tag. There is nothing to
do about that until `eslint-plugin-react` ships ESLint 10 support. Recheck with
`npm view eslint-plugin-react peerDependencies.eslint` before retrying.

**The hooks plugin did produce work, as predicted — 8 new violations.** All were
judged individually rather than blanket-suppressed, and the rules stay enabled so
new code is still checked.

- `react-hooks/static-components` (1, `packages/ui/.../Button.tsx`) — false
  positive. `useLinkComponent` memoizes its wrapper precisely to stay
  referentially stable, and Astryx's own Button uses the same pattern.
- `react-hooks/purity` (2, `FerreTypographyStudio`) — false positives.
  `Date.now()` sits in `addRole`/`duplicateRole`, which only run from `onClick`.
  A monotonic counter was rejected: it resets on reload and could collide with an
  already-persisted `custom-N` id.
- `react-hooks/set-state-in-effect` (4 of 6) — legitimate SSR-safe hydration in
  `ColourFormatContext`, `PaletteStudio`, `TypographyStudio`,
  `FerreTypographyStudio`. Reading `localStorage` in a `useState` initializer
  would run during SSR and desync hydration, so the effect is correct.

**Two are genuine and deserve a follow-up, tracked here so they are not lost:**

- `TrackDetailDialog.tsx` — resets drafts from props in an effect. Better
  expressed as a `key` on the dialog.
- `ColourPicker.tsx` — re-syncs a draft from `value`/`colourFormat` in an effect.
  Better expressed as an adjust-during-render pattern.

Both are suppressed with a pointer to this section. They are state-management
refactors, not dependency work, so they were deliberately left out of the
upgrade PR.

A note on writing these suppressions: `eslint-disable-next-line` applies to the
literal next line, so a `-- reason` that wraps onto a second comment line
silently targets the comment instead of the code. Keep the directive on one
line and put the prose in a block comment above it.

## Stage 4 — TypeScript 5.9 to 7.0

Do this last, alone, after everything else is green.

TypeScript 7 is the native-port compiler. It is two majors from 5.9.2 and is a
rewrite, not a normal bump. It is currently pinned exactly in four manifests
(`root`, `docs`, `playground`, `ui`) plus a caret in `packages/eslint-config`.

Steps:

1. Read the TypeScript 7 migration notes before touching anything.
2. Confirm `typescript-eslint` 8.68 actually supports TS 7. If it does not,
   this stage is blocked until it does. Check first, before spending time.
3. Confirm Next 16.3 and `next typegen` work with TS 7.
4. Bump all five manifests to the same version.
5. Run `pnpm check-types` and expect new errors. The colour maths in
   `packages/ui` is the most likely place for stricter inference to bite.

This stage is optional. TS 5.9 is fine to stay on if the ecosystem is not ready.
Do not force it.

**Risk:** high, and partly outside our control.

### What actually happened — the target changed to 6.0.3

**The plan missed that TypeScript 6.0 exists as a stable release.** It framed this
stage as 5.9 → 7 and skipped the bridge. 6.0.2 and 6.0.3 are both published and
stable, and Microsoft describes 6.0 as "the bridge between TypeScript 5.9 and
7.0". So this stage went to **6.0.3**, and 7.x is deferred.

**TypeScript 7 is blocked, and the reason is architectural rather than a stale
peer range.** 7.0.2 is the native Go port, and the npm package is a thin wrapper
around 20 platform binaries:

| | 5.9.2 | 6.0.3 | 7.0.2 |
| --- | --- | --- | --- |
| unpacked size | 23.6 MB | 24.3 MB | 2.5 MB |
| `bin` | `tsc`, `tsserver` | `tsc`, `tsserver` | `tsc` only |

Its `package.json` maps the root export to `./lib/version.cjs` — importing
`typescript` yields only a version string. There is no `lib/typescript.js` in the
package, `main` and `types` are unset, and the whole API surface lives under
`./unstable/*`. It vendors `vscode-jsonrpc` instead of shipping `tsserver`.

So `tsc` works — `check-types`, `test` and `build` all pass under 7.0.2 — but
anything using TypeScript *as a library* breaks. `typescript-eslint` throws
outright: "typescript-eslint does not support TS 7.0." Their tracking issue is
[typescript-eslint#10940], still open, and aimed at TS **>=7.1**.

Recheck before attempting 7 again:

```
npm view typescript-eslint peerDependencies.typescript
```

[typescript-eslint#10940]: https://github.com/typescript-eslint/typescript-eslint/issues/10940

**6.0.3 was verified end-to-end in a throwaway worktree before being applied**,
and `pnpm peers check` reports no issues, since `<6.1.0` includes it.

The two changed defaults that looked risky caused nothing:

- `types` now defaults to `[]` rather than auto-enumerating `@types`
- `noUncheckedSideEffectImports` now defaults to `true`

The tsconfigs were already well positioned for the removals: `moduleResolution`
is `NodeNext`/`Bundler` (not the removed `classic` or deprecated `node`),
`target` is an explicit `ES2022` (not the removed `es5`), `strict` and `module`
are explicit, and nothing uses `outFile`, `baseUrl`, or `downlevelIteration`.

**Risk in hindsight:** low for 6.0.3. Genuinely blocked for 7.x.

## Order summary

```
Stage 0  Node floor + pnpm 11        →  merged
Stage 1  patch/minor sweep           →  merged
Stage 2  Astryx 0.5.0                →  merged  (visual check still owed)
Stage 3  react-hooks 7               →  ESLint held at 9.39.5, 10 blocked
Stage 4  TypeScript 6.0.3            →  7.x deferred until typescript-eslint lands
```

Stages 0 and 1 are safe to do in one sitting. Stage 2 turned out small. Stages 3
and 4 are both capped by upstream rather than by this repo.

## Done since

- **Visual check against Astryx 0.5.0: passed.** The four changed token values
  look right in the playground.
- **`TrackDetailDialog` and `ColourPicker` are fixed.** Both derived their draft
  state from props inside an effect; both now adjust during render, and their
  `set-state-in-effect` suppressions are gone.

  A `key` was considered for the dialog and rejected. Closing sets the active
  track to `null`, so the key would change *while the dialog is closing* and
  remount it mid-transition. Astryx's Dialog animates out — `astryx.css` uses
  `transition-behavior: allow-discrete` and `@starting-style`, and `Dialog.js`
  computes a directional entry animation from `durationVars`/`easeVars` — so a
  remount would cut that off. A `key` is also wrong for `ColourPicker`, where the
  value changes continuously while dragging and remounting would drop focus
  mid-edit.

  Both now use the same shape, which is React's documented recipe:

  ```tsx
  const [lastInput, setLastInput] = useState(initial);
  const currentInput = /* derived from props */;
  if (currentInput !== lastInput) {
    setLastInput(currentInput);
    setDraft(/* recomputed */);
  }
  ```

  Setting state during render is supported: React re-runs the component
  immediately, before painting, so no stale frame reaches the screen and there is
  no extra paint. The dialog compares the track by reference, which mirrors the
  old effect's `[isOpen, palette]` dependencies exactly.

## Still owed

- ESLint 10, once `eslint-plugin-react` supports it.
- TypeScript 7, once `typescript-eslint` supports it.
- The four remaining `set-state-in-effect` suppressions are all SSR-safe
  localStorage hydration and are correct as they stand. Every suppression left in
  the codebase is now a known non-problem.
- ESLint 10, once `eslint-plugin-react` supports it.
- TypeScript 7, once `typescript-eslint` supports it.
