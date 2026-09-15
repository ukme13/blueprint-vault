# 2026-09-12 — Extra typography preview templates

The studio could already judge a scale as a specimen list and as an
article. Three more layouts now sit on the same picker: dashboard,
documentation, and email. They consume the six semantic roles and never
touch the generated scale, tokens, or export.

## Layouts

Each template is a presentational component in `packages/ui`, the same
place as Article, so a server-rendered docs page can import one without
crossing a client boundary. The studio still passes the editor specimen
as `text`, so one string is judged in every slot. Canned English and
Thai copy exist for hosts that do not pass `text`; the documentation
page keeps rendering Article in both languages and does not add the new
skins.

Role jobs differ per layout so the same scale is not always a title
page. Dashboard puts `heading` on the page title and `display` on KPI
numbers. Documentation keeps `display` on the page title and uses
`caption` for sidebar items and a code snippet. Email is a short
message: chrome in `label`/`caption`, a display headline, a heading, a
greeting in `title`, body, and small print.

`headingLevel` still belongs to the host. Default 1 in the studio; the
docs article stays at 3 so it does not steal the page outline.

## Studio

The picker reads `PREVIEW_TEMPLATES`. Unknown stored ids still fall back
to specimen. Layout classes stay in the playground CSS module, including
a shared surface hook so a palette background paints every template, not
only Article.

## Checks

- Vitest `preview-templates`: every layout uses all six roles, one h1,
  Thai marked, specimen overlay.
- Playwright `typography-editing.spec.ts` (template switch).

## Lessons

**A layout is a job for the roles, not a restyling of the article.**
Mapping display to the largest heading in every template would make the
dashboard and the email look like title pages. The roles stay the same;
which slot they draw changes.
