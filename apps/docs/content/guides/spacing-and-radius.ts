import type { GuidanceBlock } from "../colour";

/** The top of /studio/guides/spacing-and-radius. */
export const SPACING_AND_RADIUS_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "Spacing counts, it does not multiply",
    paragraphs: [
      "A type scale multiplies. A spacing scale does not: it is a base unit counted out in whole multiples, coarsening as it grows. That is what every scale in use does, and it is why this is not the type maths reused.",
      "The difference is not academic. A ratio of 1.25 over a 4px base gives 4, 5, 6.25, 7.81 — and nobody lays out a page on 6.25px. Counting gives 4, 8, 12, 16, which land on the same grid as everything drawn beside them.",
      "The steps are a list you edit, not a formula you set. A generated ramp is somewhere to start and then it gets pruned: half steps near the bottom where 2px is a real difference, gaps at the top where two neighbouring sizes rarely both earn their place.",
    ],
  },
  {
    heading: "Radius is named for what it wraps",
    paragraphs: [
      "Not `radius-8` but `radius-container`, `radius-element`, `radius-inner`. A token named by size is a token you have to re-decide every time the shape of the system changes; a token named by use is one you change once.",
      "They scale together from a single multiplier, so a system can go from softly rounded to nearly square without touching a component. A token that should not scale — a pill, a square avatar — says so and stays where it is.",
    ],
  },
  {
    heading: "Elevation is a shadow, held per mode",
    paragraphs: [
      "A level is a composite shadow: more than one layer, drawn from a single palette shade so the shadows in a system share a colour rather than each inventing one.",
      "Opacity is held separately for light and dark, and that is the part worth understanding. A dark surface swallows a shadow that reads perfectly on a light one — the same rgba over a dark ground is nearly invisible. Holding the opacity per mode means a level renders correctly in both without changing colour, which is what you would otherwise be tempted to do.",
    ],
  },
  {
    heading: "What comes out",
    paragraphs: [
      "Spacing exports in rem, so a page respects a reader who has changed their browser's text size. Radius exports under its use names. Elevation exports as the shadow values themselves, per mode.",
      "All three sit beside the colour and type tokens in every export format, and a workspace saved before these scales existed opens and gains sensible defaults rather than refusing.",
    ],
  },
];
