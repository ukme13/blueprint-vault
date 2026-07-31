import { hexToRgb, rgbToHex } from "./conversion";
import type { Rgb } from "./types";

export interface Hsv {
  hue: number;
  saturation: number;
  value: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function assertFinite(value: number, channel: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${channel} must be a finite number.`);
  }
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

export function rgbToHsv(red: number, green: number, blue: number): Hsv {
  assertFinite(red, "Red");
  assertFinite(green, "Green");
  assertFinite(blue, "Blue");

  const normalizedRed = clamp(red, 0, 1);
  const normalizedGreen = clamp(green, 0, 1);
  const normalizedBlue = clamp(blue, 0, 1);
  const maximum = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const minimum = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta > 0) {
    if (maximum === normalizedRed) {
      hue = 60 * (((normalizedGreen - normalizedBlue) / delta) % 6);
    } else if (maximum === normalizedGreen) {
      hue = 60 * ((normalizedBlue - normalizedRed) / delta + 2);
    } else {
      hue = 60 * ((normalizedRed - normalizedGreen) / delta + 4);
    }
  }

  return {
    hue: normalizeHue(hue),
    saturation: maximum === 0 ? 0 : delta / maximum,
    value: maximum,
  };
}

export function hexToHsv(hex: string): Hsv {
  return rgbToHsv(...hexToRgb(hex));
}

export function hsvToRgb({ hue, saturation, value }: Hsv): Rgb {
  assertFinite(hue, "Hue");
  assertFinite(saturation, "Saturation");
  assertFinite(value, "Value");

  const normalizedHue = normalizeHue(hue);
  const normalizedSaturation = clamp(saturation, 0, 1);
  const normalizedValue = clamp(value, 0, 1);
  const chroma = normalizedValue * normalizedSaturation;
  const hueSection = normalizedHue / 60;
  const second = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const match = normalizedValue - chroma;
  let channels: Rgb;

  if (hueSection < 1) channels = [chroma, second, 0];
  else if (hueSection < 2) channels = [second, chroma, 0];
  else if (hueSection < 3) channels = [0, chroma, second];
  else if (hueSection < 4) channels = [0, second, chroma];
  else if (hueSection < 5) channels = [second, 0, chroma];
  else channels = [chroma, 0, second];

  return [channels[0] + match, channels[1] + match, channels[2] + match];
}

export function hsvToHex(hsv: Hsv): string {
  return rgbToHex(...hsvToRgb(hsv));
}
