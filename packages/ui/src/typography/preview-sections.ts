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

/** Seed fills match the CSS the landing already painted. */
export const PREVIEW_SECTION_SEED_TOKEN: Record<PreviewSectionId, string> = {
  "shell-nav": "surface.base",
  "landing-hero": "surface.base",
  "landing-features": "surface.base",
  "landing-split-a": "surface.base",
  "landing-split-b": "surface.base",
  "landing-quad": "surface.base",
  "landing-quote": "surface.raised",
  "landing-pricing": "surface.base",
  "landing-cta": "surface.base",
  /* Raised, like the quote, so the sign-up reads as its own band between the
     CTA and the footer, which are both base. */
  "landing-newsletter": "surface.raised",
  "shell-footer": "surface.base",
};

export type PreviewSectionFill =
  | { kind: "token"; tokenId: string }
  | { kind: "image"; imageId: string; fallbackTokenId: string };

export interface PreviewSection {
  id: PreviewSectionId;
  fill: PreviewSectionFill;
}

export const PREVIEW_TEXT_COLOR_GROUPS = ["fg", "action", "status"] as const;
export const PREVIEW_FILL_TOKEN_GROUPS = ["surface", "action"] as const;

export function seedPreviewSections(): PreviewSection[] {
  return PREVIEW_SECTION_IDS.map((id) => ({
    id,
    fill: { kind: "token", tokenId: PREVIEW_SECTION_SEED_TOKEN[id] },
  }));
}

function isSectionId(value: string): value is PreviewSectionId {
  return (PREVIEW_SECTION_IDS as readonly string[]).includes(value);
}

function isFill(value: unknown): value is PreviewSectionFill {
  if (!value || typeof value !== "object") return false;
  const fill = value as PreviewSectionFill;
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

/** Paint a band: token colour, and a cover image when one resolved. */
export function previewSectionFillStyle(
  fill: PreviewSectionFill,
  imageUrl: string | null,
): {
  backgroundColor: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
} {
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
