"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  previewInspectKind,
  previewStyleDeclarations,
  previewStyleKey,
  previewStyleOf,
  type PreviewStyles,
  type SemanticToken,
} from "@blueprint/ui";
import type { CSSProperties } from "react";

interface PreviewStylesValue {
  styles: PreviewStyles;
  tokens: readonly SemanticToken[];
}

const EMPTY: PreviewStylesValue = { styles: {}, tokens: [] };

const PreviewStylesContext = createContext<PreviewStylesValue>(EMPTY);

/**
 * What the inspector has set on the elements of the page, for the elements to
 * read.
 *
 * Through context rather than a prop, since a slot is drawn four components
 * below the page and the page is not the one that knows which of them has an
 * override. An element with none draws exactly what it always did.
 */
export function PreviewStylesProvider({
  styles,
  tokens,
  children,
}: PreviewStylesValue & { children: ReactNode }) {
  const value = useMemo(() => ({ styles, tokens }), [styles, tokens]);
  return (
    <PreviewStylesContext.Provider value={value}>
      {children}
    </PreviewStylesContext.Provider>
  );
}

/**
 * An element's overrides as inline style: empty when it has none. A band says
 * so, since it may share its id with a slot.
 */
export function usePreviewSlotStyle(id: string, isBand = false): CSSProperties {
  const { styles, tokens } = useContext(PreviewStylesContext);
  return useMemo(
    () =>
      previewStyleDeclarations(
        previewStyleOf(styles, previewStyleKey(id, isBand)),
        tokens,
        previewInspectKind(id, isBand),
      ) as CSSProperties,
    [styles, tokens, id, isBand],
  );
}
