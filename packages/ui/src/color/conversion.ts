import type { Oklch, Rgb } from "./types";

const HEX_COLOR_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function assertFiniteChannel(value: number, channel: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${channel} must be a finite number.`);
  }
}

export function normalizeHex(hex: string): string {
  const match = HEX_COLOR_PATTERN.exec(hex.trim());

  if (!match) {
    throw new TypeError(`Invalid HEX colour: "${hex}".`);
  }

  const value = match[1]!.toLowerCase();
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((character) => character.repeat(2))
          .join("")
      : value;

  return `#${expanded}`;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex);

  return [
    Number.parseInt(normalized.slice(1, 3), 16) / 255,
    Number.parseInt(normalized.slice(3, 5), 16) / 255,
    Number.parseInt(normalized.slice(5, 7), 16) / 255,
  ];
}

export function rgbToOklch(r: number, g: number, b: number): Oklch {
  assertFiniteChannel(r, "Red");
  assertFiniteChannel(g, "Green");
  assertFiniteChannel(b, "Blue");

  const toLinear = (channel: number) =>
    channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);

  const linearRed = toLinear(clamp(r, 0, 1));
  const linearGreen = toLinear(clamp(g, 0, 1));
  const linearBlue = toLinear(clamp(b, 0, 1));

  const l =
    0.4122214708 * linearRed +
    0.5363325363 * linearGreen +
    0.0514459929 * linearBlue;
  const m =
    0.2119034982 * linearRed +
    0.6806995451 * linearGreen +
    0.1073972615 * linearBlue;
  const s =
    0.0883024619 * linearRed +
    0.2817188376 * linearGreen +
    0.6299787005 * linearBlue;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const lightness =
    0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720403 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const bAxis =
    0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
  const chroma = Math.sqrt(a * a + bAxis * bAxis);

  let hue = Math.atan2(bAxis, a) * (180 / Math.PI);
  if (hue < 0) hue += 360;

  return [lightness, chroma, hue];
}

export function oklchToRgb(
  lightness: number,
  chroma: number,
  hue: number,
): Rgb {
  assertFiniteChannel(lightness, "Lightness");
  assertFiniteChannel(chroma, "Chroma");
  assertFiniteChannel(hue, "Hue");

  const hueRadians = hue * (Math.PI / 180);
  const a = chroma * Math.cos(hueRadians);
  const bAxis = chroma * Math.sin(hueRadians);

  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * bAxis;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * bAxis;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * bAxis;

  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  const linearRed = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const linearGreen = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const linearBlue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (channel: number) =>
    channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;

  return [
    clamp(toSrgb(linearRed), 0, 1),
    clamp(toSrgb(linearGreen), 0, 1),
    clamp(toSrgb(linearBlue), 0, 1),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) => {
    assertFiniteChannel(channel, "RGB channel");
    return Math.round(clamp(channel, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function oklchToHex(
  lightness: number,
  chroma: number,
  hue: number,
): string {
  return rgbToHex(...oklchToRgb(lightness, chroma, hue));
}
