/**
 * Bind/detach helpers for the Figma-style hybrid tokenized number field.
 *
 * The stored scale is still a number. Binding is a view of that number: a
 * matching preset, or a deliberate detach so typing 1.250 does not snap back
 * onto Major Third.
 */

import type { ModularScalePreset, TypeStep } from "./typography/types";

export interface HybridTokenPreset {
  id: string;
  name: string;
  value: number;
}

export interface HybridTokenizedValue {
  isPreset: boolean;
  presetId?: string;
  value: number;
}

export function hybridPresetsFromModularScale(
  presets: readonly ModularScalePreset[],
): HybridTokenPreset[] {
  return presets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    value: preset.ratio,
  }));
}

/** One preset per generated step, named by offset so a bound chip reads 16 (+0). */
export function hybridPresetsFromTypeSteps(
  steps: readonly TypeStep[],
): HybridTokenPreset[] {
  return steps.map((step) => ({
    id: String(step.offset),
    name: `${step.offset >= 0 ? "+" : ""}${step.offset}`,
    value: step.fontSizePx,
  }));
}

/** Bound when the role follows a step; raw when the size was typed by hand. */
export function hybridValueFromStepOffset(
  stepOffset: number | null,
  fontSizePx: number,
): HybridTokenizedValue {
  if (stepOffset === null) {
    return { isPreset: false, value: fontSizePx };
  }
  return {
    isPreset: true,
    presetId: String(stepOffset),
    value: fontSizePx,
  };
}

export function bindPreset(preset: HybridTokenPreset): HybridTokenizedValue {
  return { isPreset: true, presetId: preset.id, value: preset.value };
}

export function detachValue(value: number): HybridTokenizedValue {
  return { isPreset: false, value };
}

export function valuesMatch(a: number, b: number, decimals = 3): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const factor = 10 ** Math.max(0, decimals);
  return Math.round(a * factor) === Math.round(b * factor);
}

export function formatBoundValue(value: number, decimals = 3): string {
  if (decimals <= 0) return String(Math.round(value));
  return value.toFixed(decimals);
}

export function formatRawInput(value: number, decimals = 3): string {
  if (decimals <= 0) return String(Math.round(value));
  return String(Number(value.toFixed(decimals)));
}

export function formatListValue(
  value: number,
  decimals: number,
  suffix: string,
): string {
  return `${formatBoundValue(value, decimals)}${suffix}`;
}

export function clampHybridValue(
  value: number,
  min?: number,
  max?: number,
): number {
  let next = value;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

export function parseRawNumber(
  text: string,
  fallback: number,
  options: { min?: number; max?: number; decimals?: number } = {},
): number {
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed)) return fallback;
  const decimals = options.decimals ?? 3;
  const clamped = clampHybridValue(parsed, options.min, options.max);
  return Number(clamped.toFixed(Math.max(0, decimals)));
}

export function nudgeValue(
  value: number,
  delta: number,
  step: number,
  min?: number,
  max?: number,
  decimals = 3,
): number {
  const next = clampHybridValue(value + delta * step, min, max);
  return Number(next.toFixed(Math.max(0, decimals)));
}

export function filterPresets(
  presets: readonly HybridTokenPreset[],
  query: string,
): HybridTokenPreset[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...presets];
  return presets.filter((preset) => {
    const value = String(preset.value);
    const bound = formatBoundValue(preset.value);
    return (
      preset.name.toLowerCase().includes(needle) ||
      preset.id.toLowerCase().includes(needle) ||
      value.includes(needle) ||
      bound.includes(needle)
    );
  });
}

export function moveHighlight(
  current: number,
  delta: number,
  length: number,
): number {
  if (length <= 0) return -1;
  if (current < 0) return delta > 0 ? 0 : length - 1;
  return (current + delta + length) % length;
}

/**
 * Reconcile a stored number with preset binding.
 *
 * `detachedNumeric` is the value the field was last unbound at. While it still
 * matches `numeric`, a coincidental preset (Major Third at 1.25) stays raw.
 * Any other number falls back to a matching preset, so undo and reload bind
 * themselves.
 */
export function resolveHybridValue(
  numeric: number,
  presets: readonly HybridTokenPreset[],
  detachedNumeric: number | null,
  decimals = 3,
): HybridTokenizedValue {
  if (
    detachedNumeric !== null &&
    valuesMatch(detachedNumeric, numeric, decimals)
  ) {
    return { isPreset: false, value: numeric };
  }
  const match = presets.find((preset) =>
    valuesMatch(preset.value, numeric, decimals),
  );
  if (match) {
    return { isPreset: true, presetId: match.id, value: numeric };
  }
  return { isPreset: false, value: numeric };
}

export function findPreset(
  presets: readonly HybridTokenPreset[],
  value: HybridTokenizedValue,
): HybridTokenPreset | undefined {
  if (value.isPreset && value.presetId) {
    return presets.find((preset) => preset.id === value.presetId);
  }
  return undefined;
}
