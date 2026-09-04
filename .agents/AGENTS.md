# Agent instructions

The rules for this repository live in [`CLAUDE.md`](../CLAUDE.md) at the root.
Read that file before making any change here. It is the only copy, and it is
the one that is kept current.

This file used to hold a second copy of those rules, and the copy aged exactly
as a copy does: it described an `apps/web` that has never existed in this
repository, and Astryx 0.1.3 against a workspace that is on 0.5.0. Nobody was
wrong to let it drift — nothing pointed at it, so nothing corrected it. The
lesson is the one the semantic layer makes elsewhere in this codebase: a
reference is maintainable, a copy is not.

## Specific to agents

- **Do not add rules here.** A rule that belongs to the repository belongs in
  `CLAUDE.md`, where every tool and every person reads it. This file exists to
  point at that one, for tools that look for `.agents/AGENTS.md` and do not
  read `CLAUDE.md` on their own.
- **This file carries no `ASTRYX` block, deliberately.** `astryx upgrade`
  rewrites the block in `CLAUDE.md` only, so a copy here can go stale at every
  bump and never be corrected — which is precisely what happened. Read the
  block in `CLAUDE.md`, and never edit inside its markers; the change is lost
  on the next upgrade.
- **Discover Astryx components rather than recalling them.** Run
  `pnpm exec astryx component <Name>` or `pnpm exec astryx search "<thing>"`.
  The same applies to any other dependency: check the installed version and
  read that version's documentation before writing code against it.
