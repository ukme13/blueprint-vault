"use client";

import { useState } from "react";
import { Popover } from "@astryxdesign/core/Popover";
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
import { SelectorOptionList } from "../SelectorOptionList";
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

/** A Figma-like chip that always shows its colour; it opens a list of every shade. */
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [query, setQuery] = useState("");
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

  /* One list of every shade, grouped by track and found by typing
     ("secondary 500"), on every width: a sheet on a phone, a popover under
     the chip on a wider screen. */
  /* Only where a list can show: the phone sheet, or a popover that has
     been opened. */
  const options =
    isPhone || hasOpened
      ? shadeOptionSections(palettes, (hex) => (
          <TransparencySwatch alpha={1} colour={seen(hex)} />
        ))
      : [];
  const value = shadeOptionValue({
    trackId: track.id,
    weight: resolved.weight,
  });
  const choose = (next: string) => {
    const picked = parseShadeOptionValue(next);
    if (picked) repoint(picked);
  };
  const closePicker = () => {
    setIsPickerOpen(false);
    setQuery("");
  };
  const warning = resolved.missing ? (
    <span
      className={styles.referenceWarning}
      title={MISSING_REASON[resolved.missing]}
    >
      {MISSING_LABEL[resolved.missing]}
    </span>
  ) : undefined;

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
            notice={warning}
            options={options}
            searchPlaceholder="Search shades"
            value={value}
            onChange={choose}
            onClose={() => setIsSheetOpen(false)}
          />
        </>
      ) : (
        <Popover
          alignment="start"
          /* Built on the first open, then kept. Astryx's Popover keeps its
             content mounted while closed, so a list in every chip meant
             144 hidden lists of every shade, re-rendered with the table on
             each edit; adding a token hung the page. */
          content={
            hasOpened ? (
              /* No padding of its own: the search row and the list run to the
                 popover's edges, so the list scrolls against the edge rather
                 than inside an inset box. */
              <section className="flex flex-col">
                {warning && (
                  <p className="m-0 border-b border-border-subtle px-4 py-3">
                    {warning}
                  </p>
                )}
                <SelectorOptionList
                  density="compact"
                  hasAutoFocus
                  hasSearch
                  label={`${token.name} ${mode}`}
                  options={options}
                  query={query}
                  searchPlaceholder="Search shades"
                  value={value}
                  onChoose={(option) => {
                    choose(option.value);
                    closePicker();
                  }}
                  onQueryChange={setQuery}
                />
              </section>
            ) : null
          }
          hasAutoFocus={false}
          isOpen={isPickerOpen}
          label={`${token.name} ${mode} reference`}
          placement="below"
          style={{ padding: 0 }}
          width={280}
          onOpenChange={(open) => {
            if (!open) return closePicker();
            setHasOpened(true);
            setIsPickerOpen(true);
          }}
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
