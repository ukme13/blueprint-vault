"use client";

import {
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
  onColourChange,
  onBandFillChange,
  onStyleChange,
}: StyleSectionProps & {
  /** The text's colour token, for a text slot. */
  colourTokenId?: string;
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

  /* A button and a card are filled with a token of their own; a text is
     coloured. */
  const isFilled = kind === "button" || kind === "card";
  const value = isFilled ? style.fill : colourTokenId;
  return (
    <InspectSection title="Fill">
      <div className={styles.item}>
        <TokenSelect
          clearLabel="Default"
          display={tokenDisplay(tokens, tokenColors, value)}
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
    </InspectSection>
  );
}
