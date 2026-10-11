import type { GuidanceBlock } from "../colour";

/** The top of /studio/guides/accessibility. */
export const ACCESSIBILITY_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "The sandbox",
    paragraphs: [
      "The Accessibility tab opens on a small hero: a badge, a heading, a paragraph and a button, drawn full width under the toolbar. It is there to be tried on. Every colour in it can be changed, and a score says whether the pair you are looking at still reads.",
      "Press a layer to select it. It gets an outline, handles at its corners and a size tag, and what you pick next is that layer's colour. A badge or a button selects its fill first; Ctrl or Cmd click, a double click or Ctrl Enter goes into its text, and on a phone a tap on a held container goes in and a tap on its text comes back out. What is not another layer is the background. Escape lets go.",
    ],
  },
  {
    heading: "Choosing a colour",
    paragraphs: [
      "The control bar names the selected layer and holds the picker. It has two sources. A semantic role follows light and dark, as it does in the product; a primitive shade does not, and stays the colour it is. Search finds either, and on a wide screen the 25 to 950 ramp of the track sits beside it for stepping up and down a shade.",
      "White and black are primitives too, at the top of the Primitive tab, so a label can be exactly white or exactly black without a hex typed into a role. Reset puts every layer back on the roles the sandbox opened with, and is dim while nothing has changed.",
    ],
  },
  {
    heading: "The score, and the two standards",
    paragraphs: [
      "A card over the hero's top left scores two pairs: text on its fill, and the fill on the page. A mark ahead of each is drawn in the pair measured: a bold A for heading text, an a for body and small text, a square for a fill. A pass is a tick and its grade; a fail says so. On a phone it is a strip under the hero. A canvas on its page is advisory, since it has no page of its own.",
      "WCAG 2 | WCAG 3 sits before the Vision chip on this toolbar and chooses the standard: ratios, or APCA's Lc. It re-words the hero's score and the whole report below, and it is the same preference the Colour studio's Contrast tool reads, so the two never disagree.",
      "The figure on screen is the figure judged. An Lc is judged as the whole number it shows, and a ratio is shown cut to its places and never rounded up, so \"4.5:1, fail\" cannot appear. A button's or badge's label is held to the line a label has, 4.5:1 or Lc 60, and not to body text's Lc 75.",
    ],
  },
  {
    heading: "Which text colour the studio suggests",
    paragraphs: [
      "On a saturated mid-tone such as an orange, a purple or a blue, WCAG 2's ratio leans toward black, where the eye reads white more easily. The studio chooses the text colour on a fill by APCA: the one with the larger Lc as text on that fill, white on a tie. The ratio it reports beside the choice is still WCAG 2's, so the pick can be the one with the lower ratio, and is said to be.",
      "A seeded label does the same, with a safeguard. If one of the role's own ends, or white, or black, clears both 4.5:1 and Lc 60, it is taken, in that order. If none does, it is the one APCA reads best that still reaches 3:1, the line for large text and graphics, so a colour APCA likes and WCAG 2 cannot see is not chosen over one that plainly reads.",
    ],
  },
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
