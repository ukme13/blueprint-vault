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
    heading: "Density moves the layout, not the grid",
    paragraphs: [
      "Density is one multiplier on the layout steps, step 2 and up: the gaps and paddings that decide whether an interface feels packed or airy. Compact is 0.75×, Default 1× and Spacious 1.25×, and the slider goes anywhere between.",
      "The fine steps below 2 stay where the base unit puts them at any density. A 2px hairline or a 4px nudge is a detail of drawing, not of layout, and scaling it would only take it off the grid. Those steps carry a lock in the step list to say so.",
      "A layout step's value already shows what density did to it, so the list does not repeat the multiplier beside it.",
    ],
  },
  {
    heading: "Three slots, each on a step of its own",
    paragraphs: [
      "The preview is two cards, a welcome and a profile form, and they spend spacing the three ways a layout does at once. Inset is the padding inside each card. Stack is the gap between the blocks inside it: title, text, fields, button. Columns is the gap between the two cards.",
      "Each slot is set on its own, because a card is rarely padded by the gap it stacks with. Pick a step from a slot's menu, or touch a slot and then click a step in the list: the list sets whichever slot was touched last.",
      "The spaces are marked as Figma's inspector marks them: padding hatched in blue, gaps in pink, each with a tag of its size placed where nothing is written. Show spacing hides the marks and keeps every space its size, so the cards read as the plain interface they are.",
      "The slots, the marks and the list's unit are remembered with the workspace, across pages and reloads. They change how the scale is looked at, not the scale, so none of them is an undo step.",
    ],
  },
  {
    heading: "Keeping and pruning steps",
    paragraphs: [
      "The step list sits in the settings and shows the whole ramp. The box at the start of a row keeps a step or prunes it; a pruned step stays in the list, dimmed, so it can come back, and it cannot be picked for the preview.",
      "Pruning a step that a layout use points at moves that use to the nearest step still kept, the smaller one on a tie. The export never names a spacing variable it no longer writes, and one undo puts back both the step and the use.",
      "A scale preset sets the base unit and the kept steps in one pick. Change a step afterwards and the preset reads Custom, because the scale is no longer the one it names.",
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
    heading: "Elevation, simple or advanced",
    paragraphs: [
      "Simple starts from a style and tunes it with a handful of sliders, the way Lightroom tunes a photograph. A drop shadow has Distance, Softness, Spread and Opacity; Inset, Neumorphic and Glow each have the few that matter to them. The sliders move every layer underneath together, so a level stays coherent while it changes.",
      "Advanced is the layer stack itself, as Figma's effects panel shows it. Each layer is a shadow of its own, with offset, blur, spread and opacity; a layer can be turned inward, hidden, or given a colour of its own. Its settings open beside the panel, and its icon shows the side its shadow falls on.",
      "Start in Simple and move to Advanced when a level needs something a slider cannot say. A slider that has moved offers to reset, and a double-click on it does the same.",
      "Each level is previewed on a card, a button and a dialog, over light and dark grounds, because a shadow that suits a card can be too heavy under a button. Copy CSS takes the level's box-shadow as it stands.",
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
