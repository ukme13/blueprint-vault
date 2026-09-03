"use client";

import { useState } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  addSemanticToken,
  Button,
  COLOUR_MODES,
  removeSemanticToken,
  renameSemanticToken,
  repointSemanticToken,
  resolveSemantic,
  semanticVariableName,
  type ColorTrack,
  type ColourMode,
  type SemanticToken,
} from "@blueprint/ui";
import { usePaletteView } from "./PaletteViewContext";

/**
 * Edit the semantic layer: what each name points at, in each mode.
 *
 * A table, because a layer is read as one: nineteen names down the side, the
 * two modes across, and a decision in every cell. The list of cards it
 * replaced put each token's two modes on their own rows, so comparing a
 * light value with the dark one beside it — the thing being decided — meant
 * reading diagonally. Rows are grouped by the part of the id before the dot,
 * the way the export groups them, so `surface.*` sits together and a new
 * `surface.hover` lands where somebody would look for it.
 *
 * Both modes are on screen at once rather than behind a switch. A semantic
 * token exists to hold two values, and the pair is the thing being decided —
 * choosing them one at a time is how a layer ends up with text that is dark on
 * a dark page.
 *
 * The table renders what it is given and hands every change back. What it is
 * given comes from the workspace store, in `PaletteStudio`, so the preview
 * tab and the export read the same layer this edits.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

interface ReferenceFieldProps {
  token: SemanticToken;
  mode: ColourMode;
  palettes: ColorTrack[];
  onChange: (next: SemanticToken[]) => void;
  tokens: SemanticToken[];
}

function ReferenceField({
  token,
  mode,
  palettes,
  tokens,
  onChange,
}: ReferenceFieldProps) {
  const { seen } = usePaletteView();
  const resolved = resolveSemantic(token, mode, palettes);
  if (!resolved) return null;

  const track =
    palettes.find((candidate) => candidate.id === resolved.trackId) ??
    palettes[0]!;

  const repoint = (reference: { trackId: string; weight: number }) =>
    onChange(repointSemanticToken(tokens, token.id, mode, reference));

  return (
    /* data-mode names which half of the pair this is. The swatch is decorative
       — the two selectors beside it already say the track and the weight — so
       there is no role to reach it by, and a test that guessed at nesting read
       the light swatch for both modes. */
    <div className="flex min-w-0 items-center gap-2" data-mode={mode}>
      {/* The resolved colour, simulated like every other swatch in the studio,
          so this panel agrees with the matrix beside it. */}
      <i
        aria-hidden="true"
        className="size-6 shrink-0 rounded border border-border-default"
        style={{ backgroundColor: seen(resolved.hex) }}
      />
      {/* Wide enough for a track name: the cell was splitting the row evenly
          with the name and the variable, and "primary" came out as "pri…". */}
      <div className="min-w-28 flex-1">
        <Selector
          isLabelHidden
          label={`${token.name} ${mode} track`}
          options={palettes.map((candidate) => ({
            label: candidate.name,
            value: candidate.id,
          }))}
          value={track.id}
          onChange={(trackId) => {
            /* Keep the weight when the new track has it, so switching track
               does not silently move the shade as well. */
            const next = palettes.find((candidate) => candidate.id === trackId);
            const keeps = next?.shades.some(
              (shade) => shade.weight === resolved.weight,
            );
            repoint({
              trackId,
              weight: keeps
                ? resolved.weight
                : (next?.shades[Math.floor((next.shades.length - 1) / 2)]
                    ?.weight ?? resolved.weight),
            });
          }}
        />
      </div>
      <div className="w-20 shrink-0">
        <Selector
          isLabelHidden
          label={`${token.name} ${mode} weight`}
          options={track.shades.map((shade) => ({
            label: String(shade.weight),
            value: String(shade.weight),
          }))}
          value={String(resolved.weight)}
          onChange={(weight) =>
            repoint({ trackId: track.id, weight: Number(weight) })
          }
        />
      </div>
      {resolved.missing && (
        <span
          className="shrink-0 text-xs text-status-warning"
          title={
            resolved.missing === "track"
              ? "The track this pointed at is gone."
              : "The weight this pointed at is gone."
          }
        >
          {resolved.missing === "track" ? "track gone" : "weight gone"}
        </span>
      )}
    </div>
  );
}

/** The part of an id before the dot: `surface.raised` → `surface`. */
function groupOf(id: string): string {
  return id.split(".")[0] ?? id;
}

/**
 * What a group is called in the section row.
 *
 * The id prefix is the export's spelling — `fg` is what a developer types —
 * and it makes a poor heading. A group somebody added themselves has no entry
 * here and shows its prefix, which is still what they typed.
 */
const GROUP_LABELS: Readonly<Record<string, string>> = {
  action: "Actions",
  surface: "Surfaces",
  border: "Borders",
  fg: "Foregrounds",
  focus: "Focus",
  status: "Status",
};

/**
 * Tokens in the order they are stored, bucketed by group in the order each
 * group first appears. Not sorted: the order somebody arranged is theirs, and
 * the export writes it the same way.
 */
function grouped(
  tokens: SemanticToken[],
): Array<{ group: string; tokens: SemanticToken[] }> {
  const buckets = new Map<string, SemanticToken[]>();
  for (const token of tokens) {
    const group = groupOf(token.id);
    const bucket = buckets.get(group);
    if (bucket) bucket.push(token);
    else buckets.set(group, [token]);
  }
  return [...buckets].map(([group, members]) => ({ group, tokens: members }));
}

interface SemanticEditorProps {
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  onChange: (tokens: SemanticToken[]) => void;
}

export function SemanticEditor({
  tokens,
  palettes,
  onChange,
}: SemanticEditorProps) {
  /* The label being typed, before it is committed. Renaming on every keystroke
     re-slugs the id, which is the row's key — the typography groups did that
     and lost focus after one character. */
  const [draft, setDraft] = useState<{ id: string; label: string } | null>(
    null,
  );

  if (palettes.length === 0) {
    return (
      <section
        aria-label="Semantic tokens"
        className="mx-auto max-w-4xl px-6 py-10"
      >
        <p className="text-sm text-fg-secondary">
          Semantic tokens point at palette shades, so there is nothing to build
          them from yet. Create a palette first.
        </p>
      </section>
    );
  }

  const commit = (id: string) => {
    if (draft?.id === id)
      onChange(renameSemanticToken(tokens, id, draft.label));
    setDraft(null);
  };

  return (
    <section
      aria-label="Semantic tokens"
      className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8"
    >
      <header className="flex items-end justify-between gap-4">
        <p className="max-w-2xl text-sm text-fg-secondary">
          A semantic token says when to use a colour, not what it is. Each one
          points at a palette shade, so changing the palette moves every token
          that references it.
        </p>
        <Button
          scheme="neutral"
          size="small"
          variant="outlined"
          onClick={() => onChange(addSemanticToken(tokens, palettes))}
        >
          Add token
        </Button>
      </header>

      <Table density="compact" dividers="grid" hasHover verticalAlign="middle">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Token</TableHeaderCell>
            <TableHeaderCell>Variable</TableHeaderCell>
            <TableHeaderCell>Light</TableHeaderCell>
            <TableHeaderCell>Dark</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped(tokens).flatMap(({ group, tokens: members }) => [
            /* A section row, like the group headings in a design tool's
               variables panel: the name once, and the rows under it are its. */
            <TableRow key={`group:${group}`}>
              <TableCell colSpan={5}>
                <strong
                  className="text-xs font-semibold uppercase tracking-wide text-fg-muted"
                  data-group={group}
                >
                  {GROUP_LABELS[group] ?? group}
                </strong>
              </TableCell>
            </TableRow>,
            ...members.map((token) => (
              <TableRow key={token.id}>
                <TableCell>
                  <div className="w-44" data-token={token.id}>
                    <TextInput
                      isLabelHidden
                      label={`${token.id} name`}
                      value={draft?.id === token.id ? draft.label : token.name}
                      /* Typing changes the label only. A rename re-slugs the
                         id, which is this row's React key, so doing it per
                         keystroke remounts the field and drops focus after
                         one character — the mistake the typography groups
                         already made. */
                      onChange={(label) => setDraft({ id: token.id, label })}
                      onBlur={() => commit(token.id)}
                      /* Enter blurs rather than committing directly, so both
                         paths go through one handler. */
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs text-fg-secondary">
                    {semanticVariableName(token.id)}
                  </code>
                </TableCell>
                {COLOUR_MODES.map((mode) => (
                  <TableCell key={mode}>
                    <ReferenceField
                      mode={mode}
                      palettes={palettes}
                      token={token}
                      tokens={tokens}
                      onChange={onChange}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    aria-label={`Remove ${token.name}`}
                    scheme="neutral"
                    size="xs"
                    variant="text"
                    onClick={() =>
                      onChange(removeSemanticToken(tokens, token.id))
                    }
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            )),
          ])}
        </TableBody>
      </Table>
    </section>
  );
}
