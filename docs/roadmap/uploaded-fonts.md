# Uploaded fonts plan

## Goal

Let someone judge a scale in the font they actually ship, including one that is
not on Google Fonts — a licensed retail face, a foundry commission, a brand font
that exists as a file and nowhere else.

This is stage 5 of [typography-system-rework.md](typography-system-rework.md),
where it has sat as one line — "Uploaded fonts. Only once storage is settled" —
since the model was written.

## Why now

Storage is settled. The workspace merge finished: one document, one migration,
both studios reading and writing through it, covered end to end. The gate that
line was waiting on has lifted.

The model has also been ready the whole time. `TypeFontSource` is
`"google" | "local" | "system"`, and `local` has never meant anything — the
field is written on every font entry and **read by nothing**. This feature is
the first thing that makes it load-bearing, which is worth knowing before
adding a fourth value to it.

## Where the licensing line actually falls

This section is not legal advice, and anyone shipping this commercially should
get their own. But the engineering constraints follow from one distinction that
is not in much doubt.

**Font licences rarely restrict using a font. They restrict copying and
distributing it.** So the question a font tool has to answer is not "do we allow
uploads" but "where do the bytes end up".

Three tiers, and they are genuinely different:

1. **Name only.** The user types "Helvetica Neue" and it renders if it is
   installed. Nothing is copied and no licence is engaged. The studio already
   does this, and says so: _"not a Google font, so it is not loaded here. It
   still applies wherever it is installed."_
2. **Local only.** A file the user picks is held in their own browser and used
   to render their own preview. Nothing is transmitted, hosted or handed on.
   This is close to what a desktop licence already permits — the font is on
   their machine, being used to make something.
3. **Hosted, synced, or embedded in output.** Bytes on a server, or in an
   exported stylesheet. This is distribution, and it is where the risk lives.

The specific trap for **this** product is the third one, and it is not the
upload. It is that this is an export tool. Desktop licences commonly do not
cover webfont embedding — that is a separate licence, often priced by traffic.
If an uploaded file ever reaches an export, the studio has helped someone ship a
font they may only have desktop rights to, from a file they were told it was
fine to add.

So the rule the whole plan hangs on: **bytes in, names out.**

## System model

Four ideas, and the first two are the ones that keep the rest honest.

1. **The file and the project are separate stores.** Font bytes go in IndexedDB,
   keyed by font id. The project keeps the family name and `source: "local"`,
   and never the bytes. This is not only a licensing rule, it is a size one:
   `localStorage` holds strings in about 5MB total, and a single weight of a
   text face is commonly 100KB to several MB before base64 inflates it by a
   third. A project with two uploaded families would not fit.
2. **Export emits names, never faces.** `system-export.ts` writes
   `--font-family-main: Inter, sans-serif;` today and no `@font-face` anywhere.
   That is currently an accident of what has been built. It becomes a rule with
   a test.
3. **A missing file is a normal state, not an error.** The project can be opened
   in another browser, or the store cleared. The family name still applies, the
   preview falls back like any unavailable font, and the studio says which file
   is missing and offers to re-add it. This is the same honesty the "not a
   Google font" message already has.
4. **`source` starts meaning something.** `local` selects the IndexedDB path,
   `google` the stylesheet request, `system` neither. Nothing reads the field
   today, so this is the commit that gives it a job.

## Stages

1. ✅ **The store, no UI.** An IndexedDB wrapper in `packages/ui` — put, get,
   delete, list — keyed by font id, holding the file and its metadata. Pure
   enough to test, and nothing consumes it yet.
2. ✅ **Add and render.** A file input on the font entry, `FontFace` to register
   it, and the preview rendering in it. `source` becomes `local`.
3. **Missing files.** The project opens without the store having the file: name
   still applied, honest message, re-add offered.
4. **Remove, and size limits.** Deleting an entry deletes its bytes. A cap and a
   format allowlist, with a message that says why rather than failing silently.
5. **The export guard.** The test that asserts no export path can emit font
   data, and the licence note in the UI.

Stage 5 is written last and should be reviewed first. It is the one that decides
whether the rest is safe.

## Not doing

- **Enumerating installed fonts.** Reading the user's font list is a known
  fingerprinting vector, which is why the Local Font Access API is permission
  gated. Typing a name is fine and already works; owning a privacy surface to
  save that typing is not worth it.
- **Uploading anything to a server.** There are no API routes in this app and
  this feature must not be the reason to add one.
- **Embedding fonts in exports, in any format.** Not `@font-face` with a URL,
  not base64, not "optional".
- **Converting or subsetting files.** That is a webfont pipeline, and a webfont
  pipeline is the thing this plan is avoiding being.

## Safety and quality rules

Font bytes never enter `localStorage`, the project object, the workspace file,
or any export. IndexedDB and the preview are the only places they exist.

No export path may emit font data. A test asserts this against a system holding
an uploaded font, and it should fail loudly if anyone adds an `@font-face`
writer later.

The workspace file format carries the family name and `source`, never the file.
A project file stays a document, not a payload.

Removing a font entry removes its bytes. An orphaned file in the store is a copy
of someone's licensed font that nothing references and nobody chose to keep.

The studio says, once and plainly, where the file went and what that means:
uploaded fonts stay in this browser and are never included in exports; check the
licence before shipping one on the web. Not a modal, not buried — one line where
the file is added.

Projects saved before this work must keep loading, and a project with an
uploaded font must keep loading where the file is absent.

## Definition of done

1. A user adds a font file and sees the scale rendered in it.
2. The file survives a reload.
3. Opening the same project in a browser without the file shows the family name
   applied, says the file is missing, and offers to add it again.
4. Removing the font entry removes the stored file.
5. An export of a system using an uploaded font contains the family name and no
   font data, in every format.
6. The workspace file for that system contains no font data.
7. A file that is too large or the wrong format is refused with a reason.
8. A project saved before this work still loads.

## Open decisions

- **What happens if the workspace ever syncs.** Local-only stops being local the
  moment a workspace moves between devices, and that is the point where tier 2
  becomes tier 3. Worth deciding now which way that goes, because the answer
  might be "the font is the one thing that does not sync", and that is easier to
  build for than to retrofit.
- **The size cap and the allowlist.** `woff2` alone is the safest and covers
  anything modern; accepting `ttf` and `otf` is friendlier to someone holding a
  desktop licence, which is exactly the person this feature is for. That tension
  is real and is a product call.
- **Whether an uploaded font should be previewable at all in the export dialog.**
  Showing the generated CSS next to text rendered in a font that CSS does not
  include is arguably misleading about what the export will do.
