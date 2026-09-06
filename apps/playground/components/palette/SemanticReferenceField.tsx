"use client";

import { Selector } from "@astryxdesign/core/Selector";
import {
  repointSemanticToken,
  resolveSemantic,
  type ColorTrack,
  type ColourMode,
  type SemanticMiss,
  type SemanticToken,
} from "@blueprint/ui";
import { usePaletteView } from "./PaletteViewContext";

/**
 * One mode's reference: which track, which weight, and what it resolves to.
 *
 * Lifted out of `SemanticEditor` when the table grew a sidebar, a selection
 * and a context menu. Unchanged otherwise — stage 4b replaces this in-place
 * editing with the spreadsheet's own, and until then it is the editing that
 * works.
 *
 * See docs/roadmap/semantic-table-editor.md.
 */

export interface ReferenceFieldProps {
  token: SemanticToken;
  mode: ColourMode;
  palettes: ColorTrack[];
  onChange: (next: SemanticToken[]) => void;
  tokens: SemanticToken[];
}

/* Keyed by `SemanticMiss` rather than a ternary, so a new kind of fault has to
   be given words here instead of arriving under the previous one's label —
   which is what an out-of-range alpha did on the day it was added: reported
   correctly by the resolver and shown as "weight gone". */
const MISSING_LABEL: Record<SemanticMiss, string> = {
  track: "track gone",
  weight: "weight gone",
  alpha: "alpha out of range",
};

const MISSING_REASON: Record<SemanticMiss, string> = {
  track: "The track this pointed at is gone.",
  weight: "The weight this pointed at is gone.",
  alpha: "The stored transparency is outside 0 to 100%, and is being clamped.",
};

export function ReferenceField({
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

  /* The alpha rides along. Repointing is a statement about which primitive,
     and rebuilding the reference from the two selectors alone would drop a
     transparency somebody set every time they changed the shade. */
  const repoint = (reference: { trackId: string; weight: number }) =>
    onChange(
      repointSemanticToken(tokens, token.id, mode, {
        ...reference,
        alpha: token[mode].alpha,
      }),
    );

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
          title={MISSING_REASON[resolved.missing]}
        >
          {MISSING_LABEL[resolved.missing]}
        </span>
      )}
    </div>
  );
}
