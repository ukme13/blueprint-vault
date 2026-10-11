import type { PreviewDocumentBlock } from "./preview-document";
import { previewInspectorChrome } from "./preview-shell";
import {
  PREVIEW_SECTION_LABEL,
  PREVIEW_SECTION_SEED_TOKEN,
  type PreviewSection,
  type PreviewSectionId,
} from "./preview-sections";
import { previewSurfaceLabel } from "./preview-style-model";
import type { PreviewStyles } from "./preview-style-model";

/**
 * What the panel calls the selected element: a band by its place on the page, a
 * card, a divider or a chip by what it is, and any other slot by its group.
 */
export function previewInspectTitle(id: string, isBand: boolean): string {
  if (isBand) return PREVIEW_SECTION_LABEL[id as PreviewSectionId] ?? id;
  return previewSurfaceLabel(id) ?? previewInspectorChrome(id).title;
}

/**
 * Whether anything about the selected element differs from what the seed
 * gives, which is when "Reset to default" has something to put back: a style
 * the inspector set, copy, type or colour that is not the seed's, or a band
 * that is not on its seed fill.
 */
export function previewIsOverridden(input: {
  styles: PreviewStyles;
  /** Where the element's style is kept; none when nothing is selected. */
  styleKey: string | null;
  /** The slot as it is, and as the seed gives it. Neither for a band. */
  block: PreviewDocumentBlock | null;
  defaultBlock: PreviewDocumentBlock | null;
  /** The band, when one is selected. */
  section: PreviewSection | null;
}): boolean {
  const { styles, styleKey, block, defaultBlock, section } = input;
  if (styleKey !== null && styleKey in styles) return true;
  const slotChanged = defaultBlock
    ? block?.text !== defaultBlock.text ||
      block?.roleId !== defaultBlock.roleId ||
      block?.colorTokenId !== defaultBlock.colorTokenId
    : Boolean(block?.colorTokenId);
  if (slotChanged) return true;
  if (!section) return false;
  return (
    section.fill.kind === "image" ||
    section.fill.tokenId !== PREVIEW_SECTION_SEED_TOKEN[section.id]
  );
}
