# 2026-09-22 — Dismissable dialogs, equal cards, quieter labels

Four small things noticed while using the studio rather than while building it.
None of them is architectural. They are recorded because three of the four had
a reason behind the old behaviour, and a reason worth overriding is worth
writing down.

## The backdrop closes a dialog again

New project, Rename, Workspace settings and the new-semantic-group dialog were
all `purpose="form"`. Astryx's `purpose` decides dismissal:

| value      | Escape | backdrop                              |
| ---------- | ------ | ------------------------------------- |
| `required` | no     | no                                    |
| `form`     | yes    | blocked once something has been typed |
| `info`     | yes    | yes                                   |

`form` is the right default for a dialog holding work. Astryx's own guidance
says to use it "so the user can't accidentally lose data by clicking the
backdrop". The judgement here is about what these four actually hold: a project
name, a preset choice, a rename, and settings that are written live as they
change. Every one of them costs a second to redo, which is less than the cost
of a dialog that will not close where you expect.

The delete confirmation is an `AlertDialog` and was deliberately left alone. A
destructive prompt that a stray click dismisses is a different thing entirely.
Export and the inspectors were already `info`.

## Cards now fill their row

The project grid is a `ul` with `grid-template-columns: repeat(auto-fill,
minmax(280px, 1fr))`. Each `li` is the grid item and already stretched to the
tallest card in its row, because `align-items: stretch` is the default. The
card is a `div` _inside_ the `li`, and it sized to its own content, so a card
with a shorter caption stopped short of its neighbours while the `li` behind it
was the right height all along.

Two lines fix it: the `li` becomes a flex container, and the card takes
`flex: 1`. The caption also gained `align-content: start`, so the slack lands
under the text rather than spreading the lines apart.

Worth remembering as a shape: **stretch applies to the grid item, not to what
is nested inside it.** The symptom looks like a grid problem and is a
containment problem.

## "Current" left the caption

The current project's caption read `Current · 7 colour families · Edited 3
minutes ago`. That extra word was what pushed one card's caption onto a second
line, which is what made the height difference visible in the first place.

The accent outline already marks the current card. Dropping the word would have
left that fact available only to someone who can see the outline, so the card's
link carries `aria-current="page"` instead. The information survives; only the
duplication went.

## The export list stopped naming its own format

The format list offered "Report (Markdown)" while rendering the markdown in the
pane directly beneath it. It says "Report" now.

That rename had a consequence worth recording: "Report" is a _prefix_ of
"Report (JSON)", the next entry in the same list. Playwright's `getByRole` name
matching is substring-based by default, so `{ name: "Report" }` matched both
buttons and tripped strict mode. `accessibility-report.spec.ts` now passes
`exact: true`, in the six places it names the format and in its download
helper.

## Checks

- Playwright `workspace-home`, `dialog-dismissal`, `accessibility-report` and
  `project-presets`: 28 tests.
- Lint at `--max-warnings 0`, playground types clean.
- Each new assertion seen failing first: against the old dialog purpose, the
  card without its `flex`, the restored "Current" text, and the restored label.

## Lessons learned

**A default that exists for a good reason still has to fit the case.**
`purpose="form"` guards against losing typed work. These dialogs hold a name.
The guard was right in general and wrong here, and the useful output is the
comment in `NewProjectDialog` saying which of the two it is and why.

**An accessible name that is a prefix of another name is a trap.** Shortening
a label made an existing locator ambiguous in a spec that did not otherwise
change. Nothing in the diff hinted at it; running the spec did.

**Removing a visible label is an accessibility decision.** "Current" was
redundant next to the outline for anyone who can see the outline. Deleting the
word without `aria-current` would have removed the fact rather than the
duplication.

**A test for equal heights has to create the inequality.** With the caption on
one line everywhere, all cards match whether or not the CSS is right, so the
assertion would have passed against the bug. The test lengthens one caption
first, which is the condition the rule exists for.
