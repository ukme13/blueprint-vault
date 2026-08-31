import {
  defaultSpacingScale,
  normalizeSpacingScale,
  type SpacingScale,
} from "../scale/spacing";

/**
 * The spacing slice: reading it back, and defaulting it when it is not there.
 *
 * Unlike palette and typography, and like semantics, a missing scale is filled
 * rather than left null. There is nothing to "open" — a workspace either has a
 * spacing scale or lays itself out on numbers nobody chose, so the default is
 * the honest state for a project saved before this existed.
 *
 * See docs/roadmap/scale-studio.md.
 */
export function readSpacingScale(value: unknown): SpacingScale | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.baseUnitPx !== "number") return null;
  if (!Array.isArray(raw.steps)) return null;

  return normalizeSpacingScale({
    baseUnitPx: raw.baseUnitPx,
    steps: raw.steps.filter((step): step is number => typeof step === "number"),
  });
}

/** The scale a workspace gets when it has none. */
export function spacingOrDefault(value: unknown): SpacingScale {
  return readSpacingScale(value) ?? defaultSpacingScale();
}
