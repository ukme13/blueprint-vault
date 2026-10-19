import { defaultMotionScale } from "./defaults";
import { cubicBezierCss } from "./easing";
import type {
  CubicBezier,
  DurationToken,
  EasingToken,
  MotionScale,
} from "./types";

/** A CSS-safe name: it becomes part of a custom property. */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** The longest a token may take. Past ten seconds is a typo, not a pace. */
export const MAX_DURATION_MS = 10_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toLowerCase();
  return ID_PATTERN.test(id) ? id : null;
}

function readName(value: unknown, id: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : id;
}

function readDuration(value: unknown): DurationToken | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = readId(raw.id);
  if (!id || typeof raw.ms !== "number" || !Number.isFinite(raw.ms)) {
    return null;
  }
  return {
    id,
    name: readName(raw.name, id),
    ms: Math.round(clamp(raw.ms, 0, MAX_DURATION_MS)),
  };
}

/**
 * The four numbers of a curve, held to what CSS accepts.
 *
 * `cubic-bezier()` is invalid when an x lies outside 0 to 1, and the browser
 * then drops the whole declaration, so the transition silently has no curve. A
 * y may leave the range, which is how an overshoot is drawn, within reason.
 */
function readCurve(value: unknown): CubicBezier | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  if (
    !value.every((each) => typeof each === "number" && Number.isFinite(each))
  ) {
    return null;
  }
  const [x1, y1, x2, y2] = value as number[];
  const round = (each: number) => Math.round(each * 1000) / 1000;
  return [
    round(clamp(x1!, 0, 1)),
    round(clamp(y1!, -2, 3)),
    round(clamp(x2!, 0, 1)),
    round(clamp(y2!, -2, 3)),
  ];
}

function readEasing(value: unknown): EasingToken | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = readId(raw.id);
  const curve = readCurve(raw.curve);
  if (!id || !curve) return null;
  return {
    id,
    name: readName(raw.name, id),
    curve,
    /* Written from the numbers, whatever the stored text said. */
    css: cubicBezierCss(curve),
  };
}

/** The tokens that read, once each: the first of a repeated id wins. */
function readUnique<T extends { id: string }>(
  value: unknown,
  read: (each: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const tokens: T[] = [];
  for (const each of value) {
    const token = read(each);
    if (!token || seen.has(token.id)) continue;
    seen.add(token.id);
    tokens.push(token);
  }
  /* A list that had entries and none of them read is damage, not a choice. An
     empty list is a choice, and stays empty. */
  return tokens.length === 0 && value.length > 0 ? null : tokens;
}

/**
 * A motion scale from whatever was given, every gap filled with the default.
 *
 * Each family on its own: a damaged list of durations does not cost somebody
 * their easings. Tokens keep their order, ids are made safe to use as a
 * custom property or dropped, and a curve is held to what CSS accepts.
 */
export function normalizeMotionScale(value?: unknown): MotionScale {
  const base = defaultMotionScale();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const raw = value as Record<string, unknown>;
  return {
    durations: readUnique(raw.durations, readDuration) ?? base.durations,
    easings: readUnique(raw.easings, readEasing) ?? base.easings,
  };
}

/**
 * The motion slice, read back from storage or a file.
 *
 * Filled rather than left null, like spacing: there is no studio to open, and a
 * workspace saved before motion existed has the default scale, not a gap.
 */
export function motionOrDefault(value: unknown): MotionScale {
  return normalizeMotionScale(value);
}
