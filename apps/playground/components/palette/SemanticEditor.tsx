"use client";

import { useState } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  addSemanticToken,
  Button,
  COLOUR_MODES,
  removeSemanticToken,
  renameSemanticToken,
  repointSemanticToken,
  resolveSemantic,
  type ColorTrack,
  type ColourMode,
  type SemanticToken,
} from "@blueprint/ui";
import { usePaletteView } from "./PaletteViewContext";

/**
 * Edit the semantic layer: what each name points at, in each mode.
 *
 * Both modes are on screen at once rather than behind a switch. A semantic
 * token exists to hold two values, and the pair is the thing being decided —
 * choosing them one at a time is how a layer ends up with text that is dark on
 * a dark page.
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
    <div className="flex min-w-0 flex-1 items-center gap-2" data-mode={mode}>
      {/* The resolved colour, simulated like every other swatch in the studio,
          so this panel agrees with the matrix beside it. */}
      <i
        aria-hidden="true"
        className="size-6 shrink-0 rounded border border-[var(--color-border)]"
        style={{ backgroundColor: seen(resolved.hex) }}
      />
      <div className="min-w-0 flex-1">
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
      <div className="w-24 shrink-0">
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
        <p className="text-sm text-[var(--color-text-secondary)]">
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
      className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8"
    >
      <header className="flex items-end justify-between gap-4">
        <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
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

      <ol className="flex flex-col gap-2">
        {tokens.map((token) => (
          <li
            key={token.id}
            className="flex flex-col gap-2 rounded border border-[var(--color-border)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 max-w-xs flex-1">
                <TextInput
                  isLabelHidden
                  label={`${token.id} name`}
                  value={draft?.id === token.id ? draft.label : token.name}
                  /* Typing changes the label only. A rename re-slugs the id,
                     which is this row's React key, so doing it per keystroke
                     remounts the field and drops focus after one character —
                     the mistake the typography groups already made. */
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
              <code className="truncate text-xs text-[var(--color-text-secondary)]">
                --color-{token.id.replace(/\./g, "-")}
              </code>
              <Button
                aria-label={`Remove ${token.name}`}
                scheme="neutral"
                size="xs"
                variant="text"
                onClick={() => onChange(removeSemanticToken(tokens, token.id))}
              >
                Remove
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {COLOUR_MODES.map((mode) => (
                <div
                  key={mode}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <span className="w-10 shrink-0 text-xs capitalize text-[var(--color-text-secondary)]">
                    {mode}
                  </span>
                  <ReferenceField
                    mode={mode}
                    palettes={palettes}
                    token={token}
                    tokens={tokens}
                    onChange={onChange}
                  />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
