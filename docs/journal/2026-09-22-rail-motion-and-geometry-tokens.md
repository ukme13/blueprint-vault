# 2026-09-22 — One source for rail motion and geometry

The rail has been retuned on three consecutive days: the seamless animation
pass, the tall-chrome pass, and the 20px icon and 52px width pass. Each one
found a number that disagreed with another number. That is the symptom, not
the problem. The problem is that the rail's motion and its geometry were
written as literals in several files, so nothing held them together and every
pass had to rediscover the relationships by measuring.

This entry is the cleanup. No visual change is intended; the same numbers
produce the same rail. What changes is where the numbers live.

## The motion was split across two languages

The rail animates its width in CSS while React unmounts the expanded chrome on
a `setTimeout`. Three numbers had to agree, and none of them knew about the
others:

| Number | Where it lived                                         |
| ------ | ------------------------------------------------------ |
| 240ms  | `--rail-duration` in `workspace-shell.module.css`      |
| 240    | a literal in `WorkspaceNameField.tsx`, the focus delay |
| 190    | a literal in `WorkspaceShell.tsx`, the unmount timer   |
| 180ms  | the chrome fade, repeated across two stylesheets       |

Retuning the width transition would have left the unmount timer behind. The
failure mode is not a crash. It is the icon pop-in that the 20px-icon pass was
written to remove, returning quietly some months later with no obvious cause.

`components/shell/rail-motion.ts` now owns them:

```ts
export const RAIL_MOTION = {
  FADE_MS: 180,
  UNMOUNT_MS: 190,
  DURATION_MS: 240,
} as const;
```

The module documents the invariant `FADE_MS < UNMOUNT_MS < DURATION_MS` and
why each gap exists: the chrome must finish fading before it is unmounted, and
must be unmounted well before the width settles so the collapsed triggers can
fade in while the rail is still closing. `assertRailMotion()` runs at module
load and throws if an edit breaks the order.

`railMotionStyle()` publishes the values to the rail element's `style` as
`--rail-duration`, `--rail-fade` and `--rail-ease`. The stylesheet keeps
literal fallbacks of the same values, for a render that never received the
inline style. They are defaults, not a second source: change the TypeScript and
the CSS follows.

## The geometry was repeated literals

Every row in the rail is 36px tall and every expanded container 244px wide, so
nothing shifts while the width animates. That fact was written as a literal
eleven times for the height and four times for the width, across
`rail-brand.module.css` and `shell-name.module.css`, while the rail widths
beside them were already custom properties.

Both are now declared once on `.sideNav` and inherited:

```css
--rail-row-height: 36px;
--rail-inner-width: 244px;
```

## The collapsed trigger override got smaller

The rule that start-aligns the monogram inside Astryx's `IconButton` was
written as `.collapsedTrigger span` with `!important` on two declarations. One
of them, `margin-inline-start: 0`, was already the computed value and did
nothing. The other did not need `!important`: CSS modules are unlayered in this
app and Astryx's styles are layered, so an unlayered rule wins on specificity
grounds it already had. `rail-brand.module.css` drops from nine `!important` to
seven.

## CLAUDE.md said something untrue

The icon section stated that `lucide-react` was "not yet a direct dependency"
and resolved only through `@astryxdesign/theme-neutral`, with a note to add it
before writing the first icon. It has been a direct dependency of the playground
for some time, pinned exactly at `1.38.0`, with around twenty importers.

The paragraph is corrected, and carries a line about why: a rule that states a
fact about the dependency tree goes stale the moment the tree moves. This is
the same lesson `.agents/AGENTS.md` already wrote about itself. A reference is
maintainable, a copy is not, and a rule that embeds a fact is a copy of that
fact.

## Checks

- `pnpm lint` at `--max-warnings 0` across all packages.
- `pnpm --filter playground check-types` clean.
- Playwright `e2e/workspace-shell.spec.ts` with `--reporter=line`, 17 tests.
  Two are new:
  - the rail publishes `--rail-duration: 240ms` and `--rail-fade: 180ms`;
  - `--rail-row-height` and `--rail-inner-width` resolve, and the brand row and
    name field measure from them.
- Both new tests were seen failing first. The motion one was broken by changing
  `DURATION_MS` to 300 rather than by removing the inline style, because the
  stylesheet fallback is the same value: a test that cannot tell the binding
  from the fallback proves nothing about the binding.
- The invariant guard was verified by setting `FADE_MS` above `UNMOUNT_MS` and
  loading a studio page, which showed the thrown message. That also confirms
  the bundler does not treat the module-level call as dead code.

## Lessons learned

**A number that two languages must agree on needs an owner.** A CSS custom
property is a fine home for a duration until JavaScript also needs it. At that
point the token is only half the contract, and the other half is a literal
nobody will grep for.

**Write the invariant down, then enforce it.** `FADE < UNMOUNT < DURATION` is
not derivable from the three values; it is the reason they were chosen. A
comment states it and a runtime check keeps it true, which is cheaper than a
test for a constant that has no behaviour of its own.

**Check what a test would prove before trusting it.** The first version of the
motion test also asserted the rail's computed `transitionDuration`. It failed,
correctly: this suite runs under `reducedMotion: "reduce"` on purpose, and the
rail disables its transitions in that mode. `playwright.config.ts` already says
these tests assert what a page contains and never how it arrives. The
assertion was removed and the reason left in place.

**Repeated retuning is a design signal.** Three passes in three days, each
finding a number out of step with another, was the codebase asking for a
single source. The individual fixes were all correct; the pattern was the bug.
