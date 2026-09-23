# 2026-09-23 — A studio version, held to the same rule as the schema

Earlier today the changelog shipped with a version scheme of two parts: the
date, and the workspace file version. The argument, recorded in
`2026-09-23-whats-new.md`, was that both are facts the repository holds, so
neither can drift while somebody forgets to bump a number. There was no product
version, and adding one looked like adding exactly the number people forget.

This entry adds one anyway, starting at **0.2.0**, and keeps the rule it seemed
to break.

## The gap the schema left

The file version answers one question well: can this build open my file? It
does not tell releases apart. It moves only when the format moves, so several
releases share it. Three of the six changelog entries today say Schema v8, and
the next several releases will too. Somebody reporting a problem could say
"23 September, v8" and still be describing one of three builds.

A person also needs a single short thing to quote. "I'm on 0.2" is that; a
date and a schema number together is not.

## Keeping "facts over memory"

The objection to a release number was never that numbers are bad. It was that
nothing checks them. So this one is checked:

- **One source.** `apps/playground/package.json`. `scripts/handover.ts`
  already read it for archives built from the command line.
- **The browser reads the same file.** The export dialog used to carry its own
  `const HANDOVER_VERSION = "0.1.0"`, typed by hand, with a comment saying it
  should move when the format did. It now comes from `next.config.js`, which
  reads package.json at build time and hands the bundle one string through
  `env`. An archive exported in the browser and one built by the script can no
  longer disagree.
- **A test ties the changelog to it.** The newest entry's version must equal
  package.json, so a release with no entry beside it fails CI. Read newest to
  oldest, versions may repeat but must never rise.

The schema version stays in the badge and keeps its own test. The two answer
different questions, so the badge now carries both:

```
23 September 2026 · v0.2.0 · Schema v8
```

## Why 0.2.0, and why three parts

`0.1.0` was already taken: every package.json and every handover archive said
it until today. Starting the scheme there would have made one number mean two
different things.

Three parts rather than "0.1, 0.2", because the tools that read versions
expect `major.minor.patch`. The minor number moves for new features and the
patch number for fixes, and the major stays at zero until the studio is stable
enough to promise not to break a saved file.

Entries before today carry `0.1.0`. That is a fact about them, not a
back-dated label: it is what package.json and every handover said at the time.

## Decisions

- **`env` in next.config, though Next marks it legacy.** The recommended
  route reads the process environment or `.env` files, and neither can derive
  a value from package.json without a script in front of every command.
  `env` is replaced at build time and still supported in 16.3.3.
- **`STUDIO_VERSION` declared in turbo.json**, beside `NEXT_PUBLIC_DOCS_URL`.
  `turbo/no-undeclared-env-vars` requires every `process.env` name to be
  listed. It is not a real environment variable, so the declaration changes
  nothing about caching: package.json is already one of the build's inputs,
  and a bump invalidates the cache through that.
- **Not importing package.json into the dialog.** That would ship every
  dependency name to the browser to read one field.
- **`compareVersions` compares numbers, not text.** A string comparison puts
  `0.10.0` before `0.9.0`, which is precisely the release where it would
  matter. It throws on anything that is not `major.minor.patch`, because a
  malformed version in a badge is an entry nobody checked.
- **`apps/docs/package.json` stays at 0.1.0.** The version describes the
  studio, and the test reads the studio's file. Keeping the docs app in step
  would be a second number to remember with nothing checking it.

## Checks

- `apps/docs`: changelog tests 12, up from 7. Two new for the version, three
  for the comparer, and the two badge tests updated to the new shape.
- Both new changelog tests seen failing first: package.json moved to 0.3.0
  without an entry, and an older entry claiming 0.9.0 after a newer 0.2.0.
- `next.config.js` loaded in Node reports `STUDIO_VERSION = 0.2.0`.

## Lessons learned

**A rule about drift is a rule about checking, not about which numbers
exist.** The earlier decision read as "no release number". What it actually
said was "no number nothing verifies". A release number with a test beside it
satisfies the rule; the hand-typed `0.1.0` in the export dialog, which predated
the rule, was the thing that broke it.

**Reverse a recorded decision in the record.** The previous entry argued the
opposite on the same day. Leaving that argument unanswered would make the
journal disagree with the code, which is the drift this whole scheme is meant
to prevent.
