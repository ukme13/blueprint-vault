"use client";

import { Popover } from "@astryxdesign/core/Popover";
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
import { SemanticAlphaField } from "./SemanticAlphaField";
import { TransparencySwatch } from "./TransparencySwatch";
import styles from "./semantic-table.module.css";

export interface ReferenceFieldProps {
  token: SemanticToken;
  mode: ColourMode;
  palettes: ColorTrack[];
  onChange: (next: SemanticToken[]) => void;
  onAlphaChange: (alpha: number) => void;
  onAlphaMove: (move: "down" | "right") => void;
  tokens: SemanticToken[];
}

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

/** A Figma-like chip that always shows its colour; its popover edits the alias. */
export function ReferenceField({
  token,
  mode,
  palettes,
  tokens,
  onChange,
  onAlphaChange,
  onAlphaMove,
}: ReferenceFieldProps) {
  const { seen } = usePaletteView();
  const resolved = resolveSemantic(token, mode, palettes);
  if (!resolved) return null;

  const track =
    palettes.find((item) => item.id === resolved.trackId) ?? palettes[0]!;
  const repoint = (reference: { trackId: string; weight: number }) =>
    onChange(
      repointSemanticToken(tokens, token.id, mode, {
        ...reference,
        alpha: token[mode].alpha,
      }),
    );

  return (
    <div className={styles.referenceField}>
      <Popover
        alignment="start"
        content={
          <section className={styles.referencePicker}>
            <Selector
              isLabelHidden
              label={`${token.name} ${mode} track`}
              options={palettes.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
              value={track.id}
              onChange={(trackId) => {
                const next = palettes.find((item) => item.id === trackId);
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
            {resolved.missing && (
              <span
                className={styles.referenceWarning}
                title={MISSING_REASON[resolved.missing]}
              >
                {MISSING_LABEL[resolved.missing]}
              </span>
            )}
          </section>
        }
        hasAutoFocus={false}
        label={`${token.name} ${mode} reference`}
        placement="below"
        width={280}
      >
        <button
          aria-label={`Edit ${token.name} ${mode} reference`}
          className={styles.referenceChip}
          data-mode={mode}
          data-semantic-cell={mode}
          data-semantic-token={token.id}
          type="button"
        >
          <TransparencySwatch
            alpha={resolved.alpha}
            colour={seen(resolved.hex)}
          />
          <span>
            {track.name}/{resolved.weight}
          </span>
        </button>
      </Popover>
      <SemanticAlphaField
        label={`${token.name} ${mode} transparency`}
        mode={mode}
        tokenId={token.id}
        value={resolved.alpha}
        onChange={onAlphaChange}
        onMove={onAlphaMove}
      />
    </div>
  );
}
