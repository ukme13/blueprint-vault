"use client";

import { useState } from "react";
import { Popover } from "@astryxdesign/core/Popover";
import { Selector } from "@astryxdesign/core/Selector";
import {
  parseShadeOptionValue,
  repointSemanticToken,
  resolveSemantic,
  shadeOptionSections,
  shadeOptionValue,
  type ColorTrack,
  type ColourMode,
  type SemanticMiss,
  type SemanticToken,
} from "@blueprint/ui";
import { SelectorSheet } from "../SheetSelector";
import { useIsPhone } from "../use-is-phone";
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
  const isPhone = useIsPhone();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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

  const chip = (
    <button
      aria-haspopup={isPhone ? "dialog" : undefined}
      aria-label={`Edit ${token.name} ${mode} reference`}
      className={styles.referenceChip}
      data-mode={mode}
      data-semantic-cell={mode}
      data-semantic-token={token.id}
      type="button"
      /* On a phone the chip opens the sheet itself; on a wide screen the
         Popover around it owns the click, so none is set here. */
      onClick={isPhone ? () => setIsSheetOpen(true) : undefined}
    >
      <TransparencySwatch alpha={resolved.alpha} colour={seen(resolved.hex)} />
      <span>
        {track.name}/{resolved.weight}
      </span>
    </button>
  );

  return (
    <div className={styles.referenceField}>
      {isPhone ? (
        <>
          {/* On a phone the chip opens one searchable list of every shade,
              grouped by track, instead of a popover with a track selector and
              a weight selector: the search finds "secondary 500" faster than
              two dropdowns, and a sheet gives the rows a thumb can hit. The
              same list and sheet as every other selector on a phone. */}
          {chip}
          <SelectorSheet
            hasSearch
            isOpen={isSheetOpen}
            label={`${token.name} ${mode}`}
            notice={
              resolved.missing ? (
                <span
                  className={styles.referenceWarning}
                  title={MISSING_REASON[resolved.missing]}
                >
                  {MISSING_LABEL[resolved.missing]}
                </span>
              ) : undefined
            }
            options={shadeOptionSections(palettes, (hex) => (
              <TransparencySwatch alpha={1} colour={seen(hex)} />
            ))}
            searchPlaceholder="Search shades"
            value={shadeOptionValue({
              trackId: track.id,
              weight: resolved.weight,
            })}
            onChange={(next) => {
              const picked = parseShadeOptionValue(next);
              if (picked) repoint(picked);
            }}
            onClose={() => setIsSheetOpen(false)}
          />
        </>
      ) : (
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
          {chip}
        </Popover>
      )}
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
