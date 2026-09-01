/*
 * Line height, in the three ways someone might mean it.
 *
 * A ratio is what ships: the export emits a unitless value, so a component
 * that changes its font size keeps a line height in proportion. That decision
 * predates this file and is not changed by it.
 *
 * A ratio is not what anyone authors, though. Material, Tailwind and Carbon
 * all pick a round pixel target first and let the ratio fall out of it —
 * Tailwind leaves the division in the stylesheet (`calc(1.75 / 1.125)`) and
 * Carbon ships the quotient (`1.42857`, which is 20/14). Neither picked a
 * pretty ratio and accepted whatever pixels followed.
 *
 * So both numbers are computed and both are returned. The config records what
 * the user meant; `ComputedLineHeight` carries what everything downstream
 * needs, in the unit it needs it in.
 *
 * Nothing here imports from `system.ts`. `auto` needs a per-role default
 * ratio, and taking it as an argument keeps this module pure and keeps the
 * group vocabulary — which is user-editable — on the other side of the line.
 */

/** What a role's line height is pinned to, if anything. */
export type LineHeightMode = "auto" | "px" | "ratio";

/**
 * How a role's line height was chosen.
 *
 * `auto` holds no number on purpose. A role that follows the default has to
 * keep following it when the font size moves, and a snapshot taken at the
 * moment of choosing would silently stop tracking.
 */
export type LineHeightConfig =
  | { mode: "auto" }
  | { mode: "px"; value: number }
  | { mode: "ratio"; value: number };

export interface ComputedLineHeight {
  /** For the editor and the vertical rhythm. */
  computedLineHeightPx: number;
  /** Unitless, and what the CSS export emits. */
  computedLineHeightRatio: number;
}

/**
 * The rhythm every line height lands on in `auto`.
 *
 * Four rather than two. Every line-height target in Material, Tailwind and
 * Carbon sits on 4 or 8, and `roundToEvenPx` already breaks its ties toward
 * multiples of four, so the grid was half-present before this.
 */
export const LINE_HEIGHT_GRID_PX = 4;

/**
 * The range a ratio is allowed to be, matching what the editor already
 * offered. It is also what tells a bare `24` from a bare `1.5`: nothing
 * inside this range is a plausible pixel height, and nothing outside it is a
 * plausible ratio.
 */
export const MIN_LINE_HEIGHT_RATIO = 1;
export const MAX_LINE_HEIGHT_RATIO = 2.5;

/** The ratio a role falls back to when its group has no opinion. */
export const FALLBACK_AUTO_LINE_HEIGHT_RATIO = 1.5;

/*
 * Both numbers are rounded, for different reasons.
 *
 * The ratio because `24 / 18` is 1.3333333333333333, and a stylesheet full of
 * seventeen significant figures is noise — Carbon ships five. The pixel value
 * because `18 * 1.5` is 27.000000000000004 in binary floating point, and an
 * editor showing that has a bug as far as anyone reading it is concerned.
 *
 * Deliberately not rounded to whole pixels. `ratio` mode means the ratio is
 * the thing the user pinned, and rounding its pixel value to an integer would
 * make ratio -> px -> ratio lossy for a number they chose by hand.
 */
const RATIO_DECIMALS = 4;
const PX_DECIMALS = 2;

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Snap a pixel height up to the grid.
 *
 * Up, never to nearest. Rounding down can take a ratio under the 1.4 that
 * `validation.ts` asks of Thai, whose tone marks and vowels stack above and
 * below the line — so the snap would create the fault the validator exists to
 * report. Up is also the safer error typographically: too much leading reads
 * as airy, too little reads as broken.
 */
export function snapLineHeightPx(rawPx: number): number {
  if (!Number.isFinite(rawPx) || rawPx <= 0) return 0;
  return Math.ceil(rawPx / LINE_HEIGHT_GRID_PX) * LINE_HEIGHT_GRID_PX;
}

/**
 * The pixel height and the ratio, from whichever one the role pinned.
 *
 * `autoRatio` is only read in `auto` mode; the other two ignore it.
 */
export function computeLineHeight(
  fontSizePx: number,
  config: LineHeightConfig,
  autoRatio: number = FALLBACK_AUTO_LINE_HEIGHT_RATIO,
): ComputedLineHeight {
  /* A size of zero would divide by zero on the way back to a ratio. It is not
     a size any scale produces — the floor is 11 — so this is a guard against
     malformed stored data rather than a case worth modelling. */
  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) {
    return { computedLineHeightPx: 0, computedLineHeightRatio: 0 };
  }

  if (config.mode === "px") {
    return {
      computedLineHeightPx: round(config.value, PX_DECIMALS),
      computedLineHeightRatio: round(config.value / fontSizePx, RATIO_DECIMALS),
    };
  }

  if (config.mode === "ratio") {
    return {
      computedLineHeightPx: round(fontSizePx * config.value, PX_DECIMALS),
      computedLineHeightRatio: round(config.value, RATIO_DECIMALS),
    };
  }

  const snapped = snapLineHeightPx(fontSizePx * autoRatio);
  return {
    computedLineHeightPx: snapped,
    computedLineHeightRatio: round(snapped / fontSizePx, RATIO_DECIMALS),
  };
}

/** Which unit a bare number means, when something wants to force the answer. */
export type LineHeightUnit = "px" | "ratio";

/**
 * Read what someone typed into the line-height field.
 *
 * Returns null for anything unreadable, so the caller can keep the value it
 * had rather than storing a guess. An empty field is not unreadable — it is
 * how somebody clears an override, which is `auto`.
 *
 * A bare number is read by its size rather than by a unit toggle. The two
 * ranges do not overlap in any real scale: no line height is a ratio above
 * 2.5, and none is a pixel height below 4. So `1.5` is a ratio, `24` is a
 * pixel height, and nobody has to find a control first to be understood.
 *
 * `unit` forces the reading, for a caller that does have a toggle. An
 * explicit `px` suffix beats both — someone who typed the unit has said what
 * they meant more clearly than any control has.
 */
export function parseLineHeightInput(
  raw: string,
  unit?: LineHeightUnit,
): LineHeightConfig | null {
  const text = raw.trim().toLowerCase();
  if (text === "" || text === "auto") return { mode: "auto" };

  const hasPxSuffix = text.endsWith("px");
  const numberText = hasPxSuffix ? text.slice(0, -2).trim() : text;

  /* Number() rather than parseFloat: parseFloat reads "1.5rem" as 1.5 and
     "12abc" as 12, so a typo becomes a silent value change. */
  const value = Number(numberText);
  if (numberText === "" || !Number.isFinite(value) || value <= 0) return null;

  if (hasPxSuffix || unit === "px") {
    return { mode: "px", value };
  }

  if (unit === "ratio") {
    return value >= MIN_LINE_HEIGHT_RATIO && value <= MAX_LINE_HEIGHT_RATIO
      ? { mode: "ratio", value }
      : null;
  }

  if (value >= MIN_LINE_HEIGHT_RATIO && value <= MAX_LINE_HEIGHT_RATIO) {
    return { mode: "ratio", value };
  }

  /* Above the ratio range it is a pixel height somebody did not type the unit
     for. Below it — 0.5, say — it is neither, and guessing would be worse
     than saying so. */
  return value > MAX_LINE_HEIGHT_RATIO ? { mode: "px", value } : null;
}

/** What the field shows for a config, given the size it resolves against. */
export function formatLineHeightInput(config: LineHeightConfig): string {
  if (config.mode === "auto") return "auto";
  /* The px suffix is kept in the field rather than implied, so what comes
     back out is what the parser would read the same way. */
  if (config.mode === "px") return `${round(config.value, PX_DECIMALS)}px`;
  return `${round(config.value, RATIO_DECIMALS)}`;
}

/**
 * Read a line height out of stored data.
 *
 * Every project saved before this file holds a bare number, which meant a
 * ratio, so that is what it becomes. Detected by shape rather than gated on a
 * version, as the rest of this package's readers already are.
 */
export function readLineHeightConfig(value: unknown): LineHeightConfig | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return { mode: "ratio", value };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("mode" in value)) return null;

  if (value.mode === "auto") return { mode: "auto" };

  if (
    (value.mode === "px" || value.mode === "ratio") &&
    "value" in value &&
    typeof value.value === "number" &&
    Number.isFinite(value.value) &&
    value.value > 0
  ) {
    return { mode: value.mode, value: value.value };
  }

  return null;
}
