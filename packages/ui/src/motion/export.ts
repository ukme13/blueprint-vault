import type { MotionScale } from "./types";

/*
 * Motion as the three formats a system is handed over in.
 *
 * Custom properties are the one name every consumer shares: `--duration-fast`
 * and `--ease-standard` are written the same in plain CSS and in Tailwind, so
 * a component that says `transition: opacity var(--duration-fast)
 * var(--ease-standard)` reads in either.
 */

/** `--duration-fast: 150ms;` and `--ease-standard: cubic-bezier(...);` */
export function motionCssLines(scale: MotionScale, indent = "  "): string[] {
  return [
    ...scale.durations.map(
      (token) => `${indent}--duration-${token.id}: ${token.ms}ms;`,
    ),
    ...(scale.durations.length > 0 && scale.easings.length > 0 ? [""] : []),
    ...scale.easings.map(
      (token) => `${indent}--ease-${token.id}: ${token.css};`,
    ),
  ];
}

/** The scale as a `:root` block. */
export function formatMotionCss(scale: MotionScale): string {
  return [":root {", ...motionCssLines(scale), "}"].join("\n");
}

/**
 * The scale for a Tailwind v4 theme.
 *
 * `--ease-*` is a theme namespace, so each easing becomes an `ease-standard`
 * utility by being declared. Tailwind has no duration namespace, so a duration
 * is declared as a plain property in the theme and given its utility by hand
 * (`duration-fast`), which reads the property and so follows it.
 */
export function formatMotionTailwind(scale: MotionScale): string {
  const utilities = scale.durations.map((token) =>
    [
      `@utility duration-${token.id} {`,
      `  transition-duration: var(--duration-${token.id});`,
      "}",
    ].join("\n"),
  );
  return [
    ["@theme static {", ...motionCssLines(scale), "}"].join("\n"),
    ...utilities,
  ].join("\n\n");
}

/**
 * The scale as Design Tokens groups.
 *
 * A duration is a `duration` with its unit written, like the dimensions beside
 * it; an easing is a `cubicBezier`, its four numbers.
 */
export function motionDesignTokenGroups(
  scale: MotionScale,
): Record<string, unknown> {
  return {
    motion: {
      duration: {
        $type: "duration",
        $description: "Durations exported from Blueprint.",
        ...Object.fromEntries(
          scale.durations.map((token) => [
            token.id,
            { $value: `${token.ms}ms` },
          ]),
        ),
      },
      easing: {
        $type: "cubicBezier",
        $description: "Easing curves exported from Blueprint.",
        ...Object.fromEntries(
          scale.easings.map((token) => [
            token.id,
            { $value: [...token.curve] },
          ]),
        ),
      },
    },
  };
}

/** The Design Tokens file for the scale alone. */
export function formatMotionDesignTokens(scale: MotionScale): string {
  return JSON.stringify(motionDesignTokenGroups(scale), null, 2);
}
