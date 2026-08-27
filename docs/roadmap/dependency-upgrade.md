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

**Risk:** high. Give this its own branch and expect real work.

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

## Order summary

```
Stage 0  Node floor + pnpm 11        →  merge
Stage 1  patch/minor sweep           →  merge
Stage 2  Astryx 0.5.0                →  merge   (visual check required)
Stage 3  ESLint 10 + hooks 7         →  merge
Stage 4  TypeScript 7                →  only if the ecosystem supports it
```

Stages 0 and 1 are safe to do in one sitting. Stage 2 is a real project. Stages
3 and 4 can wait.
