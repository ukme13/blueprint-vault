# 2026-09-12 — Preview document instead of a stamped pangram

Article, Documentation and Email stopped painting the specimen string on
every slot. They now share one editable document: blocks of copy tagged
with workspace roles. Specimen stays the one-string list. Dashboard left
the picker — it is chrome, and belongs on `/preview` later.

## Model

`previewDocument` sits on the typography slice. Each block has an id, a
`roleId`, and text. Missing or empty on an older save is the article
starter, resolved against that workspace's roles (`h1` for the title
when it exists). Applying a style writes `roleId` only. The scale, the
tokens and the export do not read this field.

Enter in a heading opens a body block; Enter in a paragraph stays a
paragraph. Backspace at the start of a block merges it with the one
above. The last block cannot be deleted.

## Studio

A ghost Selector labelled Text preset lists the workspace's roles,
grouped as they are in the editor. It sits in one sticky preview
toolbar with text colour and background colour, so those three stay
on screen while the document scrolls. Specimen, Article, Documentation
and Email stay a row above that bar: they pick a layout, they are not
tools. Click a block and pick a role from there. The selection is the
block that contains the caret, or every block the highlight intersects.
Character spans are not a thing: a heading is a block.

Documentation and Email keep canned chrome (sidebar, from/subject,
footer) around the same document. The foundations typography page still
renders `ArticleTemplate` in English and Thai and is not an editor.

## Checks

- Vitest `preview-document`, `preview-templates`, `workspace`,
  `workspace-file`.
- Playwright `typography-editing.spec.ts` (shared document, selection
  toolbar, apply h2, reload).

## Lessons

**A layout that is a document wants a document.** Stamping one specimen
string onto every slot is the right test for a scale list and the wrong
test for an article. Dashboard failed for a different reason: it is not
a document at all.

**Keep the latest document on a ref.** Applying a role from the floating
picker blurs the contenteditable in the same gesture. The blur handler
was rewriting from a stale copy and putting the old role back. Patch
functions that read `documentRef.current` compose; closures over the
render's document do not.
