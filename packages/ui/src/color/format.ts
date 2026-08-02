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
