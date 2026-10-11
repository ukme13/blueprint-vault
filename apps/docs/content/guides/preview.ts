import type { GuidanceBlock } from "../colour";

/** The top of /studio/guides/preview. */
export const PREVIEW_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "What the inspector is for",
    paragraphs: [
      "The Preview draws a whole page from the semantic layer. The inspector, a column beside it, is how you change that page's parts without leaving it: select something and the column shows what it is made of. It is a way to try a system on a real layout, and what it sets is kept with the project, undone with the same Undo as everything else, and put back by Reset to default.",
      "The column is 317px wide and stays open while you work; Hide inspector and the bar's button put it away and bring it back. On a phone it is a bottom sheet, and every list in it opens as a sheet too.",
    ],
  },
  {
    heading: "Selecting",
    paragraphs: [
      "Press text, a button, a band, a card, the Popular tag, the newsletter field or the footer's last row. The selection is an outline in the studio's info tone, softened so it does not bury what is under it, with handles at the corners and a size tag. A group of cards, the three features or the plans, is picked together and outlined card by card; the featured plan is its own. Pressing what is selected again lets go of it, and so does Escape.",
      "A band is selected by pressing its own ground, away from its text and buttons. The footer's last row owns the line above it, so that line is selected by pressing the row.",
    ],
  },
  {
    heading: "What each kind of element offers",
    paragraphs: [
      "Text has its copy, its type role, its colour and its opacity. A button has its copy, type, padding, radius, fill, a label colour, stroke and effects. A band, a card and the newsletter field have padding, radius, opacity, fill, stroke and effects, and a card has a gap as well, since it lays its children out. The Popular tag is text in a small shape: copy, type, padding, radius, a fill, its text colour and a stroke. A divider has its stroke and the room around it.",
      "Padding and radius are set for the whole element, by axis, or one side or corner at a time; where the sides disagree the field says Mixed. Every value is a token reference, a step of the spacing scale, a token of the radius scale, a level of the elevation scale or a semantic role, and none is a free length, so a change moves with the scale it came from.",
      "A list's Default row, and a control with nothing set, say the number the page draws, such as 8px. The panel starts from what the page is already drawn with: an outlined button shows its edge, a contained one its shadow and its fill, a card its fill and border.",
    ],
  },
  {
    heading: "Stroke and effects",
    paragraphs: [
      "A stroke is a border token with a position, inside, centred or outside, and a weight. It is drawn as an outline over the border it replaces, so an element is the same size with an edge, with another or with none. Removing the page's own edge is a choice to have none, and Reset to default gives it back.",
      "The eye beside a stroke or an effect keeps it and stops it drawing, so you can see the element with and without it. Editing something that is hidden shows it again. An empty section adds from anywhere on its heading, and not only from the Plus.",
    ],
  },
  {
    heading: "Buttons",
    paragraphs: [
      "A button can be dressed Contained or Outlined. Contained is the action fill, its label and a light shadow, with no edge; outlined is no fill, plain text, an edge and no shadow. Choosing one starts that pattern clean, dropping any fill, label colour, edge or shadow set for the other, and keeps the padding and radius. It is one edit, so one undo takes it back.",
      "The label is derived from the fill, white on the action fill, until you choose a label colour of its own; removing that hands the label back to the fill. Apply type to all buttons carries the type role across every button on the page, and nothing else: the fills stay as they are.",
    ],
  },
];
