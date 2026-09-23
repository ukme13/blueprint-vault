import type { GuidanceBlock } from "../colour";

/** The top of /studio/guides/accessibility. */
export const ACCESSIBILITY_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "What the contrast numbers mean",
    paragraphs: [
      "WCAG 2.2, and the thresholds it sets: normal text passes AA at 4.5:1 and AAA at 7:1, large text at 3:1 and 4.5:1, and anything that is not text — a control, a border, a focus ring, a graphical object — needs 3:1.",
      "Large means 18pt, or 14pt when bold. The studio converts that at the usual ratio rather than making you do it, but it is worth knowing why a heading can pass where the paragraph under it fails on the same two colours.",
      "You can measure against white, against black, or against a colour you choose, which is the case that comes up when a brand surface is neither.",
    ],
  },
  {
    heading: "The Vision chip",
    paragraphs: [
      "Four simulations: protanopia, deuteranopia, tritanopia and achromatopsia. The transform is Machado, Oliveira and Fernandes (2009), applied to the colour the palette holds — it changes nothing in your project and only what is drawn.",
      "Severity runs from full strength down to a tenth, in the steps the paper tabulates, so every setting is a published matrix rather than an interpolation somebody invented. Below full strength the condition is not blindness to a colour but reduced sensitivity, and the chip renames itself to say so: red-weak rather than protanopia.",
      "Severity never reaches zero, because zero is not a severity — it is the chip being off.",
    ],
  },
  {
    heading: "Pairs that collapse",
    paragraphs: [
      "The warning worth having is not about contrast. Success green and error red usually pass every ratio in the book and land on nearly the same colour under deuteranopia, which is the most common deficiency there is.",
      "So the studio measures how close pairs come in perceptual space under each simulation and names the ones that collapse. That is design guidance rather than a WCAG pass or fail — the rule underneath it is older and simpler: colour should not be the only thing carrying a meaning.",
    ],
  },
  {
    heading: "The report",
    paragraphs: [
      "One export, in Markdown for a person and JSON for a machine, built from the same source so the two cannot disagree. It carries the contrast results, the pairs that collapse, the roles the layer defines and the type scale where there is one.",
      "It states its own method: which WCAG version, which simulation matrices, and which surface a transparent colour was composited over. A report whose method is unstated cannot be checked once the formulas underneath it change, which is the point of writing it down.",
    ],
  },
];
