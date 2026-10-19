/**
 * Motion tokens: how long a change takes, and the curve it follows.
 *
 * Two families, as spacing and radius are two: durations, which are lengths of
 * time, and easings, which are shapes. They are named for the feeling they give
 * (`fast`, `decelerate`), not the number they hold, so a system can retune its
 * pace without renaming what points at it.
 */

/** A length of time. The exported name: `fast` becomes `--duration-fast`. */
export interface DurationToken {
  id: string;
  name: string;
  /** Whole milliseconds. */
  ms: number;
}

/** The four numbers of a CSS `cubic-bezier()`: x1, y1, x2, y2. */
export type CubicBezier = [number, number, number, number];

/** A curve. The exported name: `standard` becomes `--ease-standard`. */
export interface EasingToken {
  id: string;
  name: string;
  curve: CubicBezier;
  /**
   * The curve as CSS reads it, kept beside the numbers so a reader of the
   * file sees what it will write. Always derived from `curve` on the way in,
   * so the two cannot disagree.
   */
  css: string;
}

/** The motion half of a workspace. */
export interface MotionScale {
  durations: DurationToken[];
  easings: EasingToken[];
}
