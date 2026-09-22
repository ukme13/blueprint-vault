import type { GuidanceBlock } from "../colour";

/** The top of /studio/guides/anchors. */
export const ANCHORS_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "The problem anchors solve",
    paragraphs: [
      "A generated ramp is the right default and the wrong answer to one question: the brand colour. You have a hex somebody signed off, and the generator gives you a shade near it but not it. Typing the exact value into one swatch fixes that swatch and breaks the row — the ramp no longer moves as one thing, and the next time the source changes your correction is either lost or left behind as a lump.",
      "An anchor is the fix. It says: the ramp must pass exactly through this colour at this weight, and everything around it bends to suit. You get the real hex where it matters and a smooth row either side of it.",
    ],
  },
  {
    heading: "Editing a shade, and promoting the edit",
    paragraphs: [
      "Edit a shade directly and it becomes an override: that one swatch holds the value you typed and nothing else changes. Useful while you are trying things, and a liability if you leave it there, because it is a hole in a generated row.",
      "Promote the override and it becomes an anchor. The row is regenerated to pass through it, blending between the anchors rather than between the endpoints. The difference shows immediately in the shades either side.",
      "Every track has two anchors before you add any: the lightest and the darkest, which is what keeps the 50 and 950 boundaries true. The source colour is a third. Yours go in between.",
    ],
  },
  {
    heading: "How many is too many",
    paragraphs: [
      "Each anchor is a point the curve must hit, so enough of them and there is no curve left — just the points you typed, joined up. Two or three in a track is a palette with brand colours in it. Eight is a list of colours with a generator attached, and you will feel it the next time you change the source and almost nothing moves.",
      "If you find yourself anchoring most of a row, the source colour is probably wrong. Change that instead and let the ramp do the work.",
    ],
  },
  {
    heading: "Getting back",
    paragraphs: [
      "Undo works on anchors as it does everywhere, and a track's reset drops every manual change on the row at once. That reset is guarded, because it is the one action here that throws away work you cannot get back by moving a slider.",
      "Anchors and overrides both survive export and import: they are part of the project file, not of the rendered palette. A workspace you send to somebody else regenerates exactly the same shades on their machine.",
    ],
  },
];
