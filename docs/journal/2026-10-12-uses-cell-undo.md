# 2026-10-12 — Ctrl+Z in a Uses cell undoes the layout, not the digits

One commit on `feat/layout-uses-table-undo`, written on 2026-09-19 and rebased onto
today's `main`. In the Uses table, Ctrl+Z with the cursor in a cell undid the typed
digits in that cell. It never reached the document's history, so a person who had
just changed a layout use could not take it back with the key.

## Key changes

- **The table takes Ctrl or Cmd+Z, and Shift for redo, itself.** A key handler on the
  Uses section calls the history's undo and redo and stops the key there. A name field
  is the exception: it holds an uncommitted draft until blur, so it keeps the
  browser's own undo.
- **A cell edit is one history step.** A change to one cell (`layout:cell:<use>:<frame>`)
  carries an edit key, so typing `2` then `0` into a cell is one step and not two. The
  table passes the key through `onChange`, and the studio hands it to the history.
- **Tests.** An end-to-end one types `20` into a cell, presses Ctrl+Z with the cursor
  still in it, and finds the layout back at 4. A unit one holds that two writes to the
  same cell are one step, and that undo returns the old value. A third holds that a
  deleted custom use comes back in its old slot, and that a system use cannot be deleted.

## Architectural decisions

- **The key is the table's, not the window's.** The window's shortcut leaves text
  fields to their own undo, which is right for a name and wrong for a cell whose
  value is a layout use. A handler on the section sits between the two and says which
  inputs are the document's.
- **The edit key names the cell.** Two cells never merge into one step, and one cell's
  keystrokes always do.

## Lessons learned

- **The commit was seven weeks old and two of its tests were stale.** The delete
  test expected a layout of three uses, and removed a use the system now protects; the
  end-to-end test read a storage key that no longer exists. Both were rewritten to
  what the code does today (a custom use, and the storage helper), and the key handler
  is what the end-to-end test now fails without.
- **A rebase over a rewritten table is a merge of intent.** The table had grown a hint,
  a typography prop and a new body; the change was kept to three small edits on top of
  it: the two props, the key on the cell, and the handler on the section.
