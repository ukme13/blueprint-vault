"use client";

import {
  PREVIEW_PAGE_TOKEN,
  splitAlphaHex,
  type SemanticToken,
} from "@blueprint/ui";
import { InspectSection, InspectStatic } from "./InspectPrimitives";
import { tokenDisplay } from "./inspect-shared";
import styles from "./inspect-panel.module.css";

/**
 * The page itself, for when nothing is selected: what is behind the bands.
 *
 * A row like a fill's, with the token's swatch and name, and the colour as it
 * resolves in the mode being looked at, with its opacity. It is the canvas role,
 * `surface.base`, which the Semantics tab edits, so it is shown and not chosen
 * here.
 */
export function PageSection({
  tokens,
  tokenColors,
}: {
  tokens: readonly SemanticToken[];
  tokenColors: Record<string, string> | undefined;
}) {
  const shown = tokenDisplay(tokens, tokenColors, PREVIEW_PAGE_TOKEN);
  const resolved = tokenColors?.[PREVIEW_PAGE_TOKEN];
  const colour = resolved ? splitAlphaHex(resolved) : null;
  return (
    <InspectSection title="Page">
      <div className={styles.item}>
        <InspectStatic icon={shown?.icon} label="Page colour">
          {shown?.text ?? PREVIEW_PAGE_TOKEN}
          {colour ? (
            <small>
              {colour.hex.slice(1).toUpperCase()} ·{" "}
              {Math.round(colour.alpha * 100)}%
            </small>
          ) : null}
        </InspectStatic>
      </div>
    </InspectSection>
  );
}
