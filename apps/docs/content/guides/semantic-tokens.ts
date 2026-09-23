import type { GuidanceBlock } from "../colour";

/** The top of /studio/guides/semantic-tokens. */
export const SEMANTIC_TOKENS_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "A name, and one reference per mode",
    paragraphs: [
      "A primitive shade says what a colour is. A semantic token says when to use it. `fg.primary` is body text, `surface.raised` is a card on the canvas, `border.subtle` is a divider — and each one holds a reference to a palette shade for light and another for dark.",
      "That pairing is the whole point. A developer writes one name and gets the right colour in both modes, and when you move the shade underneath, every use of the name moves with it. Nothing in a product has to know that `surface.raised` is neutral 100 today.",
    ],
  },
  {
    heading: "What a new project starts with",
    paragraphs: [
      "The seed covers foreground, surface, border, action, status and focus. Each action and status tone carries a set rather than a single colour: a fill, a hovered fill, a pressed fill, a soft surface, a foreground for text on that surface, and a border. So an alert or a ghost button is built from the layer rather than from shade numbers.",
      "A workspace saved before a role existed gains it the next time it is opened. The count is a fact about the current seed, not about your file — which also means a role you deliberately deleted stays deleted, because the file records that decision too.",
    ],
  },
  {
    heading: "Transparency",
    paragraphs: [
      "A reference can carry an alpha, written as a percentage the way Figma writes it. Three of the seeded roles use one because they were always describing transparency: `border.subtle` at 12% in light and 16% in dark, `fg.disabled` at 45% and 50%, `surface.overlay` at 96% and 92%. Every tone's soft surface and its hover use one too.",
      "A transparent swatch is drawn over a checker so you can see that it is transparent rather than pale. The values were chosen to match the solid colours they replaced, so turning them on changed nothing on screen — which is the point: they were faking it before and are honest about it now.",
      "Transparency reaches the exports as an alias rather than as a flattened colour. A CSS export writes `color-mix(in oklab, var(--color-neutral-300) 12%, transparent)`, so a client who changes the shade underneath still gets a 12% divider.",
    ],
  },
  {
    heading: "What contrast means for a transparent colour",
    paragraphs: [
      "It has none on its own. A 12% border has no ratio against anything until you know what is behind it, so the studio composites it over the surface it sits on and measures the result — in sRGB, on the encoded values, because that is what a browser paints.",
      "The reports say so rather than quietly reporting a number: a row measured on a composite names the shade, the percentage, the surface it was laid over and the colour that came out.",
    ],
  },
];
