import type { GuidanceBlock } from "../colour";

/** The top of /studio/guides/typography. */
export const TYPOGRAPHY_GUIDE_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "Three numbers make the scale",
    paragraphs: [
      "A base size, a ratio and a step count. Every step is the one below it times the ratio, which is the maths every type scale has used since long before anybody generated one.",
      "Sizes are rounded to even pixels and floored at 11. Even because a half pixel is a blurred edge on the displays most people still have; floored because 11 is about as small as a caption can be and stay readable, and body text landing there should fail a check rather than be quietly allowed. The exact computed value is kept underneath, so changing the ratio does not accumulate rounding error step by step.",
    ],
  },
  {
    heading: "Roles, not sizes",
    paragraphs: [
      "A step is a number; a role is a job. Display, headings, body, label, caption — you add them, name them and group them, and each one points at a step. Weight, line height and letter spacing are the role's, not the step's, so two roles on the same size can differ in every other way.",
      "Line height can be automatic, computed per group from a ratio, or set outright. Automatic is right more often than it sounds: a display line wants less leading than body text, and per-group ratios say that once instead of role by role.",
      "Where a role needs to differ by screen size, it can carry per-device values. Where it does not, it carries one and stays simple.",
    ],
  },
  {
    heading: "The fonts",
    paragraphs: [
      "Pick from Google Fonts and the studio loads the family at runtime, filtered by the scripts it actually covers. Or upload a file — a licensed retail face, a foundry commission, a brand font that exists nowhere else — and it is stored in this browser and rendered in the previews.",
      "An uploaded font never leaves. No export path can emit font data in any form: not a URL, not base64, not optional. A test asserts that, because the alternative is redistributing somebody's licensed typeface on your behalf. A project opened without its font files says so and offers to take them again, rather than silently rendering in a fallback.",
    ],
  },
  {
    heading: "Judging it, not just generating it",
    paragraphs: [
      "The previews are real text in English and Thai, because a scale that has only ever held Latin has not been tested. Thai ascenders and descenders stack higher and deeper than Latin ones, and a line height that looks generous in English can collide in Thai.",
      "The article template is the one that matters. A specimen of nine sizes in a column always looks fine; a heading, a standfirst, three sections and a caption is where a ratio that grows too fast shows up as a page that shouts.",
    ],
  },
];
