"use client";

import type { ReactNode } from "react";
import {
  previewButtonLabelOf,
  type PreviewNative,
  PREVIEW_FILL_TOKEN_GROUPS,
  PREVIEW_TEXT_COLOR_GROUPS,
  type PreviewSectionFill,
} from "@blueprint/ui";
import { InspectSection } from "./InspectPrimitives";
import {
  RemoveButton,
  tokenDisplay,
  useTokenOptions,
  type StyleSectionProps,
} from "./inspect-shared";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

/**
 * What an element is coloured: text its ink, a button what it is filled with,
 * a band its ground. Always a token; the first two can be put back to the
 * page's own, a band always has one.
 */
export function FillSection({
  kind,
  style,
  tokens,
  tokenColors,
  colourTokenId,
  bandFill,
  native,
  onColourChange,
  onBandFillChange,
  onStyleChange,
}: StyleSectionProps & {
  /** The text's colour token, for a text slot. */
  colourTokenId?: string;
  /** What the element is drawn with before it is changed. */
  native: PreviewNative;
  /** A band's own fill, which may be an image. */
  bandFill?: PreviewSectionFill | null;
  onColourChange: (tokenId: string | undefined) => void;
  onBandFillChange: (tokenId: string) => void;
}) {
  const textOptions = useTokenOptions(
    tokens,
    tokenColors,
    PREVIEW_TEXT_COLOR_GROUPS,
  );
  const fillOptions = useTokenOptions(
    tokens,
    tokenColors,
    PREVIEW_FILL_TOKEN_GROUPS,
  );

  if (kind === "band") {
    const tokenId =
      bandFill?.kind === "image" ? bandFill.fallbackTokenId : bandFill?.tokenId;
    return (
      <InspectSection title="Fill">
        <div className={styles.item}>
          <TokenSelect
            display={tokenDisplay(tokens, tokenColors, tokenId)}
            hasSearch
            label="Fill"
            options={fillOptions}
            value={tokenId}
            onChange={(next) => next && onBandFillChange(next)}
          />
        </div>
        {bandFill?.kind === "image" ? (
          <p className={styles.note}>
            An image is laid over this colour. Remove it from the ⋯ on the band.
          </p>
        ) : null}
      </InspectSection>
    );
  }

  /* A button, a card and a chip are filled with a token of their own; a text
     is coloured. */
  const isFilled = kind === "button" || kind === "card" || kind === "chip";
  const value = isFilled ? style.fill : colourTokenId;
  /* What the page fills it with, until that is changed: shown, and marked. */
  const shown = tokenDisplay(
    tokens,
    tokenColors,
    value ?? (isFilled ? native.fill : undefined),
  );
  const display = shown && value === undefined ? withDefaultMark(shown) : shown;
  return (
    <InspectSection title="Fill">
      <div className={styles.item}>
        <TokenSelect
          clearLabel="Default"
          display={display}
          hasSearch
          label="Fill"
          options={isFilled ? fillOptions : textOptions}
          placeholder="Default"
          value={value}
          onChange={(next) =>
            isFilled
              ? onStyleChange({ ...style, fill: next })
              : onColourChange(next)
          }
        />
        <RemoveButton
          isDisabled={value === undefined}
          label="Remove fill"
          onClick={() =>
            isFilled
              ? onStyleChange({ ...style, fill: undefined })
              : onColourChange(undefined)
          }
        />
      </div>
      {kind === "button" || kind === "chip" ? (
        <LabelColour
          kind={kind}
          options={textOptions}
          style={style}
          tokenColors={tokenColors}
          tokens={tokens}
          onStyleChange={onStyleChange}
        />
      ) : null}
    </InspectSection>
  );
}

/**
 * A button's label colour. Left alone it follows the fill, and says so; set,
 * it is the token chosen, and removing it hands the label back to the fill.
 */
function LabelColour({
  kind,
  style,
  tokens,
  tokenColors,
  options,
  onStyleChange,
}: Pick<
  StyleSectionProps,
  "style" | "tokens" | "tokenColors" | "onStyleChange"
> & {
  kind: "button" | "chip";
  options: ReturnType<typeof useTokenOptions>;
}) {
  const label = previewButtonLabelOf(style, tokens, kind);
  const shown = label ? tokenDisplay(tokens, tokenColors, label.tokenId) : null;
  return (
    <div className={styles.item}>
      <TokenSelect
        clearLabel="Auto"
        display={
          shown && label && !label.isChosen
            ? {
                ...shown,
                text: (
                  <>
                    Auto <small>{shown.text}</small>
                  </>
                ),
              }
            : shown
        }
        hasSearch
        label="Label colour"
        options={options}
        placeholder="Auto"
        value={style.labelColor}
        onChange={(next) => onStyleChange({ ...style, labelColor: next })}
      />
      <RemoveButton
        isDisabled={style.labelColor === undefined}
        label="Remove label colour"
        onClick={() => onStyleChange({ ...style, labelColor: undefined })}
      />
    </div>
  );
}

/** A value the page has by itself, said so: the token, and that it is the default. */
function withDefaultMark(shown: { icon: ReactNode; text: ReactNode }) {
  return {
    ...shown,
    text: (
      <>
        {shown.text} <small>Default</small>
      </>
    ),
  };
}
