import {
  hexToRgb,
  normalizeHex,
  oklchToHex,
  rgbToHex,
  rgbToOklch,
} from "./conversion";

export const COLOUR_FORMATS = ["hex", "oklch", "rgb"] as const;

export type ColourFormat = (typeof COLOUR_FORMATS)[number];

export const COLOUR_FORMAT_LABELS: Record<ColourFormat, string> = {
  hex: "HEX",
  oklch: "OKLCH",
  rgb: "RGB",
};

export function isColourFormat(value: unknown): value is ColourFormat {
  return COLOUR_FORMATS.includes(value as ColourFormat);
}

export function formatColour(hex: string, format: ColourFormat): string {
  const normalized = normalizeHex(hex);

  if (format === "hex") return normalized.toUpperCase();

  const rgb = hexToRgb(normalized);
  if (format === "rgb") {
    return `rgb(${rgb.map((channel) => Math.round(channel * 255)).join(" ")})`;
  }

  const [lightness, chroma, hue] = rgbToOklch(...rgb);
  return `oklch(${(lightness * 100).toFixed(1)}% ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
}

/**
 * Whether what has been typed so far is a whole colour, and so can be applied
 * as the person types.
 *
 * A HEX is whole at six digits. At three it is also valid, as shorthand, but a
 * person typing `#111000` passes through `#111` on the way, and applying that
 * as `#111111` replaces what they are typing with a colour they did not mean.
 * Shorthand is applied when they finish (Enter, or leaving the field) instead.
 * The other formats have no such midpoint: a value either parses or does not.
 */
export function isWholeColourDraft(
  value: string,
  format: ColourFormat,
): boolean {
  if (format !== "hex") return true;
  return /^#?[0-9a-f]{6}$/i.test(value.trim());
}

export function parseColour(value: string, format: ColourFormat): string {
  if (format === "hex") return normalizeHex(value);

  const numbers = value.match(/-?\d*\.?\d+/g)?.map(Number);
  if (
    !numbers ||
    numbers.length !== 3 ||
    numbers.some((number) => !Number.isFinite(number))
  ) {
    throw new TypeError(
      `Invalid ${COLOUR_FORMAT_LABELS[format]} colour: "${value}".`,
    );
  }

  if (format === "rgb") {
    if (numbers.some((number) => number < 0 || number > 255)) {
      throw new RangeError("RGB channels must be between 0 and 255.");
    }
    return rgbToHex(numbers[0]! / 255, numbers[1]! / 255, numbers[2]! / 255);
  }

  const [lightness, chroma, hue] = numbers;
  if (
    lightness! < 0 ||
    lightness! > 100 ||
    chroma! < 0 ||
    hue! < 0 ||
    hue! > 360
  ) {
    throw new RangeError("OKLCH channels are outside their allowed range.");
  }
  return oklchToHex(lightness! / 100, chroma!, hue!);
}
