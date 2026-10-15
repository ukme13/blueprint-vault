import { semanticGroupOf, semanticGroupLabel } from "../color/token-rows";
import { semanticVariableName, type SemanticToken } from "../color/semantic";

/**
 * Frozen bands on `/preview`. The ⋯ edits fill on these ids; it cannot add
 * a section. Same rule as nav and footer slots.
 */
export const PREVIEW_SECTION_IDS = [
  "shell-nav",
  "landing-hero",
  "landing-features",
  "landing-split-a",
  "landing-split-b",
  "landing-quad",
  "landing-quote",
  "landing-pricing",
  "landing-cta",
  "landing-newsletter",
  "shell-footer",
] as const;

export type PreviewSectionId = (typeof PREVIEW_SECTION_IDS)[number];

export const PREVIEW_SECTION_LABEL: Record<PreviewSectionId, string> = {
  "shell-nav": "Nav",
  "landing-hero": "Hero",
  "landing-features": "Features",
  "landing-split-a": "Split A",
  "landing-split-b": "Split B",
  "landing-quad": "Quad",
  "landing-quote": "Quote",
  "landing-pricing": "Pricing",
  "landing-cta": "CTA",
  "landing-newsletter": "Newsletter",
  "shell-footer": "Footer",
};

/**
 * The token each band is seeded with, or `null` for no fill: the band shows the
 * page, and a colour is added to it from the panel. The ones seeded with a
 * surface of their own match the CSS the landing already painted.
 */
export const PREVIEW_SECTION_SEED_TOKEN: Record<
  PreviewSectionId,
  string | null
> = {
  "shell-nav": null,
  "landing-hero": null,
  "landing-features": null,
  "landing-split-a": null,
  "landing-split-b": null,
  "landing-quad": null,
  "landing-quote": "surface.raised",
  "landing-pricing": null,
  "landing-cta": null,
  /* Raised, like the quote, so the sign-up reads as its own band between the
     CTA and the footer, which are both base. */
  "landing-newsletter": "surface.raised",
  "shell-footer": null,
};

/**
 * What a band is painted with. `none` is no fill at all: the page shows
 * through. A token is a fill of the band's own, whichever token it is: one
 * chosen as `surface.base` stays that when the page's colour changes.
 */
export type PreviewSectionFill =
  | { kind: "none" }
  | { kind: "token"; tokenId: string }
  | { kind: "image"; imageId: string; fallbackTokenId: string };

export interface PreviewSection {
  id: PreviewSectionId;
  fill: PreviewSectionFill;
}

export const PREVIEW_TEXT_COLOR_GROUPS = ["fg", "action", "status"] as const;
export const PREVIEW_FILL_TOKEN_GROUPS = ["surface", "action"] as const;

/** The fill a band is seeded with, and is put back to. */
export function previewSectionSeedFill(
  id: PreviewSectionId,
): PreviewSectionFill {
  const tokenId = PREVIEW_SECTION_SEED_TOKEN[id];
  return tokenId === null ? { kind: "none" } : { kind: "token", tokenId };
}

export function seedPreviewSections(): PreviewSection[] {
  return PREVIEW_SECTION_IDS.map((id) => ({
    id,
    fill: previewSectionSeedFill(id),
  }));
}

/** Whether a band is as it was seeded. */
export function isPreviewSectionSeedFill(section: PreviewSection): boolean {
  const seed = PREVIEW_SECTION_SEED_TOKEN[section.id];
  if (seed === null) return section.fill.kind === "none";
  return section.fill.kind === "token" && section.fill.tokenId === seed;
}

function isSectionId(value: string): value is PreviewSectionId {
  return (PREVIEW_SECTION_IDS as readonly string[]).includes(value);
}

function isFill(value: unknown): value is PreviewSectionFill {
  if (!value || typeof value !== "object") return false;
  const fill = value as PreviewSectionFill;
  if (fill.kind === "none") return true;
  if (fill.kind === "token") {
    return typeof fill.tokenId === "string" && fill.tokenId.length > 0;
  }
  if (fill.kind === "image") {
    return (
      typeof fill.imageId === "string" &&
      fill.imageId.length > 0 &&
      typeof fill.fallbackTokenId === "string" &&
      fill.fallbackTokenId.length > 0
    );
  }
  return false;
}

function isSection(value: unknown): value is PreviewSection {
  if (!value || typeof value !== "object") return false;
  const section = value as PreviewSection;
  return isSectionId(section.id) && isFill(section.fill);
}

/**
 * A stored list, or the seed. Always the known ids, in seed order.
 *
 * Unknown ids drop. A missing known id is filled from the seed.
 */
export function readPreviewSections(value: unknown): PreviewSection[] {
  const seeded = seedPreviewSections();
  if (!Array.isArray(value)) return seeded;
  const byId = new Map(
    value.filter(isSection).map((section) => [section.id, section]),
  );
  return seeded.map((slot) => byId.get(slot.id) ?? slot);
}

export function previewSection(
  sections: readonly PreviewSection[],
  id: string,
): PreviewSection | undefined {
  return sections.find((section) => section.id === id);
}

export function updateSectionFill(
  sections: readonly PreviewSection[],
  id: string,
  fill: PreviewSectionFill,
): PreviewSection[] {
  return sections.map((section) =>
    section.id === id ? { ...section, fill } : section,
  );
}

export function previewSectionImageIds(
  sections: readonly PreviewSection[],
): string[] {
  return sections.flatMap((section) =>
    section.fill.kind === "image" ? [section.fill.imageId] : [],
  );
}

/** The token a fill shows: its own, or the one under an image. None has none. */
export function previewSectionFillTokenId(
  fill: PreviewSectionFill,
): string | undefined {
  if (fill.kind === "token") return fill.tokenId;
  if (fill.kind === "image") return fill.fallbackTokenId;
  return undefined;
}

/**
 * A band's fill after a token is chosen for it, or `null` to take it away.
 *
 * An image stays: the token is the colour under it, and it is let go of from the
 * band's own menu, so taking the fill away from it changes nothing.
 */
export function previewSectionFillWithToken(
  fill: PreviewSectionFill,
  tokenId: string | null,
): PreviewSectionFill {
  if (fill.kind === "image") {
    return tokenId ? { ...fill, fallbackTokenId: tokenId } : fill;
  }
  return tokenId === null ? { kind: "none" } : { kind: "token", tokenId };
}

/**
 * What paints the Preview page behind its bands by default: the canvas role,
 * `surface.base`. A band with no fill shows it, so choosing another colour for
 * the page changes every band that has none; a band given a fill, even this
 * token, keeps it.
 */
export const PREVIEW_PAGE_TOKEN = "surface.base";

/**
 * The token a band is given when a fill is added to it: the one it was seeded
 * with, and else a raised surface, which is a colour that can be told from the
 * page. The person then picks the one they want, `surface.base` among them.
 */
export function previewBandFillToAdd(id: PreviewSectionId): string {
  return PREVIEW_SECTION_SEED_TOKEN[id] ?? "surface.raised";
}

/**
 * The page's colour as a custom property, set on the page and read by a band that
 * has to be opaque over it: the sticky nav, which content scrolls under.
 */
export const PREVIEW_PAGE_VARIABLE = "--preview-page";

/**
 * Paint a band: token colour, and a cover image when one resolved.
 *
 * A band with no fill is transparent, so the page shows through. One that cannot
 * be, because content passes under it, takes the page's colour from its
 * variable instead. A token is always painted, the page's own token included.
 */
export function previewSectionFillStyle(
  fill: PreviewSectionFill,
  imageUrl: string | null,
  options: { isOpaque?: boolean } = {},
): {
  backgroundColor: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
} {
  if (fill.kind === "none") {
    return {
      backgroundColor: options.isOpaque
        ? `var(${PREVIEW_PAGE_VARIABLE}, var(${semanticVariableName(PREVIEW_PAGE_TOKEN)}))`
        : "transparent",
    };
  }
  const tokenId = fill.kind === "token" ? fill.tokenId : fill.fallbackTokenId;
  const backgroundColor = `var(${semanticVariableName(tokenId)})`;
  if (fill.kind !== "image" || !imageUrl) {
    return { backgroundColor };
  }
  return {
    backgroundColor,
    backgroundImage: `url(${JSON.stringify(imageUrl)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}

export function previewTokenSelectorOptions(
  tokens: readonly SemanticToken[],
  groups: readonly string[],
): Array<{
  type: "section";
  title: string;
  options: Array<{ value: string; label: string }>;
}> {
  const allowed = new Set(groups);
  const buckets = new Map<string, SemanticToken[]>();
  for (const group of groups) {
    buckets.set(group, []);
  }
  for (const token of tokens) {
    const group = semanticGroupOf(token.id);
    if (!allowed.has(group)) continue;
    buckets.get(group)?.push(token);
  }
  return [...buckets]
    .filter(([, members]) => members.length > 0)
    .map(([group, members]) => ({
      type: "section" as const,
      title: semanticGroupLabel(group),
      options: members.map((token) => ({
        value: token.id,
        label: token.name,
      })),
    }));
}
