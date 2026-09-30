import type { ShadeItem, TrackAdjustments } from "./types";

/**
 * Nicknames for shades, and the comment an export puts beside a token.
 *
 * A nickname is text somebody typed that ends up inside a file another tool
 * reads, in the middle of a CSS comment. So it is cleaned twice: lightly while
 * it is typed, so the field still lets a space be typed, and fully whenever it
 * is read back or exported, so the comment can never be closed early by a `*` and
 * a `/` in what somebody wrote.
 */

/** Long enough for a name, short enough not to wreck the token's line. */
export const MAX_SHADE_LABEL_LENGTH = 40;

/**
 * What is safe to keep while the field is being typed in.
 *
 * Newlines out, comment delimiters out, the length capped; the spaces are left
 * alone, since trimming as somebody types would make a second word impossible.
 */
export function cleanShadeLabel(value: string): string {
  let text = value.replace(/[\r\n\t]+/g, " ");
  // Until nothing is left to remove: taking a delimiter out can join the
  // characters either side of it into a new one, so one pass is not enough.
  // (Line comments here: a delimiter written inside a block comment would end
  // it, which is the very thing this function exists to stop.)
  while (text.includes("/*") || text.includes("*/")) {
    text = text.split("/*").join("").split("*/").join("");
  }
  return text.slice(0, MAX_SHADE_LABEL_LENGTH);
}

/**
 * A nickname as it is stored and exported: cleaned, one space at a time, and
 * trimmed. Empty when nothing is left, which reads as no nickname.
 */
export function sanitizeShadeLabel(value: unknown): string {
  if (typeof value !== "string") return "";
  return cleanShadeLabel(value).replace(/\s+/g, " ").trim();
}

/** The nicknames that are left after cleaning, or undefined for none. */
export function readShadeLabels(
  value: unknown,
): Record<number, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const entries = Object.entries(value).flatMap(([weight, label]) => {
    const numericWeight = Number(weight);
    const clean = sanitizeShadeLabel(label);
    return Number.isInteger(numericWeight) && clean
      ? [[numericWeight, clean] as const]
      : [];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * The adjustments with one shade's nickname set, or cleared when it is empty.
 *
 * `labels` is left off when none remain, so a project that never nicknamed a
 * shade is stored exactly as it was before nicknames existed.
 */
export function withShadeLabel(
  adjustments: TrackAdjustments,
  weight: number,
  label: string,
): TrackAdjustments {
  const { labels: previous, ...rest } = adjustments;
  const labels = { ...previous };
  const typed = cleanShadeLabel(label);
  /* Kept as typed while there is something in it, spaces included; only a
     field that is empty, or only spaces, clears the nickname. */
  if (typed.trim() === "") delete labels[weight];
  else labels[weight] = typed;
  return Object.keys(labels).length > 0 ? { ...rest, labels } : rest;
}

/**
 * What an export says beside a shade's token, or null for nothing.
 *
 * A nickname wins. Without one the source shade is `main` and a custom anchor
 * is `submain`; every other shade says nothing.
 */
export function shadeExportComment(
  shade: Pick<ShadeItem, "weight" | "anchorType">,
  adjustments: Pick<TrackAdjustments, "labels"> | undefined,
): string | null {
  const nickname = sanitizeShadeLabel(adjustments?.labels?.[shade.weight]);
  if (nickname) return nickname;
  if (shade.anchorType === "source") return "main";
  if (shade.anchorType === "custom") return "submain";
  return null;
}
