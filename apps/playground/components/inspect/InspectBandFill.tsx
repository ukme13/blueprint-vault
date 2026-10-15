"use client";

import {
  previewBandFillToAdd,
  previewSectionFillTokenId,
  PREVIEW_FILL_TOKEN_GROUPS,
  type PreviewSectionFill,
  type PreviewSectionId,
  type SemanticToken,
} from "@blueprint/ui";
import { InspectSection } from "./InspectPrimitives";
import {
  AddButton,
  RemoveButton,
  tokenDisplay,
  useTokenOptions,
} from "./inspect-shared";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

/**
 * A band's Fill, which is empty until one is added, as a stroke and an effect
 * are. With none the band shows the page; the + (or the row) gives it a token,
 * and the - is the only way back. A token chosen from the list, the page's own
 * included, is a fill like any other.
 */
export function BandFillSection({
  bandId,
  fill,
  tokens,
  tokenColors,
  onChange,
}: {
  bandId: PreviewSectionId;
  fill: PreviewSectionFill;
  tokens: readonly SemanticToken[];
  tokenColors?: Record<string, string>;
  /** A token for the fill, or `null` to take it away. */
  onChange: (tokenId: string | null) => void;
}) {
  const options = useTokenOptions(
    tokens,
    tokenColors,
    PREVIEW_FILL_TOKEN_GROUPS,
  );

  if (fill.kind === "none") {
    const add = () => onChange(previewBandFillToAdd(bandId));
    return (
      <InspectSection
        action={<AddButton label="Add fill" onClick={add} />}
        isEmpty
        title="Fill"
        onAdd={add}
      />
    );
  }

  const tokenId = previewSectionFillTokenId(fill);
  return (
    <InspectSection title="Fill">
      <div className={styles.item}>
        <TokenSelect
          display={tokenDisplay(tokens, tokenColors, tokenId)}
          hasSearch
          label="Fill"
          options={options}
          value={tokenId}
          onChange={(next) => next && onChange(next)}
        />
        {/* An image is taken off from the band's own menu, so there is nothing
            here to take away while one is laid over the colour. */}
        <RemoveButton
          isDisabled={fill.kind === "image"}
          label="Remove fill"
          onClick={() => onChange(null)}
        />
      </div>
      {fill.kind === "image" ? (
        <p className={styles.note}>
          An image is laid over this colour. Remove it from the ⋯ on the band.
        </p>
      ) : null}
    </InspectSection>
  );
}
