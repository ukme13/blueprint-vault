# 2026-10-11 — White and black as primitives

One commit on `feat/static-base-colors`. A label on a filled control could only be
a shade of a palette track, so a green fill whose neutral ends fell short had no
label that read. White (`#ffffff`) and black (`#000000`) are now primitives that
are in no palette, and a role can point at them.

## Key changes

- **A reserved static track.** `STATIC_COLOURS` are white at weight 0 and black at
  weight 1000, one past both ends of every ramp, so neither can be the weight of a
  shade. A reference to one is the same `{ trackId, weight }` as any other and
  resolves with no tracks at all (`resolveSemanticToken`).
- **Exports carry them.** `--color-white` and `--color-black` are declared beside
  the palette, a role that uses one aliases `var(--color-white)`, and the Design
  Tokens file has a `static` group (`{palette.static.white}`). The docs app's
  generated export is regenerated.
- **`fg.on-*` labels choose by both lines a label is held to.** WCAG 2's 4.5:1 and
  APCA's Lc 60 on the Lc as shown. Candidates in order: the role's own track ends,
  the better by ratio first, then pure white and black. The first to clear both wins,
  so a palette whose neutral ends already read is seeded exactly as it was; failing
  that, the first to clear the ratio; failing that, whichever pure colour gives more.
- **Pickers list them.** The sandbox's Primitive tab and the Semantics reference
  open with a Static section (White, Black); the chip names them rather than
  numbering them.

## Architectural decisions

- **A track that is not in the palette, not a pair of palette entries.** White and
  black are the same in every project and mode, and cannot be renamed or deleted.
  Making them a reference with a reserved id keeps the token file's shape: a file
  saved before they existed reads back as it was, and an older build reports the
  two references as a missing track rather than failing to load.
- **Weights 0 and 1000.** The scale's ends are 25 and 950; 0 and 1000 are outside
  it, which is what keeps a static reference from ever being mistaken for a shade.
- **Two lines, not one.** The ratio and Lc disagree on a mid-tone fill: the ratio
  favours the dark end where APCA wants the light one. A label that fails either is
  not chosen while one that passes both exists.

## Lessons learned

- **A reference that cannot fall off the end needs somewhere to resolve.** The
  resolver assumed every `trackId` is a palette track; a static one resolves with
  no tracks, and needed its branch before the "missing track" path.
- **Keep what already read exactly as it was.** Making the pure colours the last
  candidates, after the role's own ends, means no existing palette changes its
  labels: only a fill that had none that read is moved.
- **A generated export is part of the change.** The docs app installs the export
  as a client would; its drift test is what notices a changed primitive set.
