import type { GuidanceBlock } from "../colour";

/** The top of /studio/guides/export. */
export const EXPORT_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "Five things you can take out",
    paragraphs: [
      "CSS custom properties, for a project that wants the tokens and nothing else. A Tailwind theme block, for one that wants utilities named after them. DTCG design tokens, for a pipeline that reads the format. A Blueprint project file, which is the studio's own document. And the accessibility report, in Markdown or JSON.",
      "Colour values can be written as hex, OKLCH or RGB, and the choice is shared across the studio — a picker and an export never disagree about how a colour is spelled.",
    ],
  },
  {
    heading: "The project file is the one that matters to you",
    paragraphs: [
      "Everything else describes the system. The project file *is* the system: every track and its source colour, every anchor and override, the semantic layer, the type scale, the three scales, the preview settings.",
      "Your work lives in this browser and nowhere else, so this file is the only copy that survives a cleared cache or a change of machine. Export it somewhere you keep your other work, and import it anywhere — it regenerates the same palette, because what it stores is the decisions rather than the results.",
    ],
  },
  {
    heading: "The handover is the one that matters to a client",
    paragraphs: [
      "One archive: the three export formats, the typography stylesheet, the workspace itself, the accessibility report in both formats, a README naming every file and saying which to install, and the foundation pages built as a static site against that workspace.",
      "The pages open from a folder with nothing running. A client gets documentation describing the system they were actually given rather than Blueprint in general — the tables on those pages are generated from the same file that generated the stylesheets.",
      "What is not in it: this guide, and anything else written for whoever operates the studio. A client receives a system, not a tool, and an automated check reads every byte of each archive to keep it that way.",
    ],
  },
  {
    heading: "Installing what comes out",
    paragraphs: [
      "The README names the order. In short: the CSS or the Tailwind block carries the tokens, the typography stylesheet carries the faces and the roles, and a product references the semantic names rather than the primitive shades.",
      "That last part is the whole discipline. A product that reaches for `neutral 300` has copied a value; one that uses `border.subtle` has installed a system, and will still be right after the next palette change.",
    ],
  },
];
