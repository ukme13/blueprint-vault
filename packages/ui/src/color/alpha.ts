/**
 * The editor accepts percentages while semantic references store a 0 to 1
 * opacity. Keeping that boundary here means every caller validates the same
 * way before it writes a workspace.
 */
export function clampAlpha(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

/** A compact percentage for a table cell: `0.125` becomes `12.5%`. */
export function formatAlpha(value: number): string {
  return `${Number((clampAlpha(value) * 100).toFixed(2))}%`;
}

/**
 * Parse the percentage a person typed. Values outside the editable range are
 * invalid rather than clamped: a field should explain a mistake, not replace
 * it with a nearby value without notice.
 */
export function parseAlpha(input: string): number | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*%?\s*$/.exec(input);
  if (!match) return null;
  const percentage = Number(match[1]);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
    return null;
  return percentage / 100;
}
