import type { GuidanceBlock } from "./colour";

/**
 * The words on the typography page.
 *
 * Content, kept apart from data for the same reason the colour guidance is:
 * what a role is worth is written by a person and changes when the rules
 * change; what a role *is* comes from the workspace and changes whenever
 * somebody drags a slider. A page that mixed them would need editing every
 * time a client dropped their own file in.
 *
 * One convention, and a test enforces it. A backticked token starting with
 * `--` is a variable a developer installs. Every other backticked token is a
 * role id or a group id, and has to exist in the system a new project starts
 * from. So units, keywords and numbers are written plainly — "16px", "auto",
 * "unitless" — because backticking them would make them claim to be roles.
 *
 * Guidance names roles and variables, never values. "Body copy is `body`, and
 * a component asks for `--font-body-size`", not "body copy is 16 pixels" — the
 * whole point of the page below it is that the number is the workspace's to
 * change.
 */

/** The top of /foundations/typography. */
export const TYPOGRAPHY_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "A role is not a step",
    paragraphs: [
      "A step is a size the scale generated. A role is a decision about what one of those sizes is for — `h2` is a section title, `body` is the paragraph somebody reads. Many roles can share a step: a button is usually body's size with more weight, and a caption is one step below it. Adding a role never means adding a step.",
      "That separation is what keeps the ramp honest. The step count answers how many distinct sizes the system wants; the role list answers how many jobs there are. A system that conflated them would grow a new size every time somebody needed a new label.",
      "A role records how far it sits from the base step rather than which step it is. An offset survives a change to the step count; an index into the ramp does not, and silently points at a different size the moment somebody adds a step at the bottom.",
      "`label` and `caption` are the newest roles and they show how a role gets added: two things wanted a size under body and neither could name one, so both reached for a bare step. A kicker and a byline in the article template, and an eyebrow, a badge and a card action on this documentation's own home page. Five uses across two products is the argument; one page wanting something is not.",
    ],
  },
  {
    heading: "Why the sizes are whole numbers",
    paragraphs: [
      "A modular scale multiplies, so it produces decimals by definition. Every generated size is rounded to an even number of pixels, with one exception: nothing goes below 11px, which is the single odd size the system allows and only ever appears at the floor. A tie between two even candidates resolves to whichever divides by four, which pulls the scale towards the grid most component work already sits on.",
      "The exact value is shown beside the rounded one wherever rounding moved it. That is deliberate: rounding makes the ratio a guide rather than a law, and a guide that quietly disagrees with the number beside it is worse than no guide. Where the table shows one number, the ratio landed there on its own.",
      "Two adjacent steps can round to the same size when the ratio is tight for the base. That is left alone. Forcing them apart would distort the ratio further to hide a problem the ratio itself is reporting.",
      "A size somebody typed is a decision and is never rounded. Rounding applies to sizes the scale generates.",
    ],
  },
  {
    heading: "Line height is stored as an intent",
    paragraphs: [
      "A role does not store a line height, it stores how one should be chosen. Most roles are on auto, which means they follow their group's ratio, so changing a size moves the line height with it. A role can pin a ratio or a pixel height instead when a specific piece of layout needs one.",
      "It exports unitless, always. A unitless line height multiplies the element's own font size, so a component that changes size keeps its proportions; a pixel line height freezes a decision made at one size and breaks at every other. The page below shows both the ratio the export writes and what it works out to at that role's size, because the ratio is the token and the pixels are what somebody is looking at.",
    ],
  },
  {
    heading: "Reference the role, never the number",
    paragraphs: [
      "Product code names a role variable. `--font-body-size` says what the text is; 16px says only how big it was the day it was typed, and freezes a decision the type scale exists to own. The same holds for the whole set a role emits — its family, weight, line height, letter spacing and transform each have a variable, and using five of them is what makes a heading a heading rather than a paragraph that happens to be large.",
      "Every role's variables are listed beside it below, spelled exactly as the exported file spells them. A role named with a capital or a space becomes lower case and hyphens on the way out, so the name on this page is the name to paste.",
      "The step sizes are exported too, as `--font-size-0` and its siblings. They are numbered by position in the ramp, smallest first, so `--font-size-0` is the floor rather than the base — the roles above count from base and these count from the bottom, which is a difference worth checking before pasting one. They exist for the rare case that wants a size with no role attached, and reaching for one is usually a sign a role is missing.",
    ],
  },
];

/**
 * Guidance under each group on /foundations/typography.
 *
 * Keyed by group id. A group with no entry renders its table and no prose,
 * which is the right failure: a group somebody added themselves has no
 * guidance anybody has written yet.
 *
 * There are three, because a new system starts with three. The plan for this
 * page listed five — display, heading, body, label and caption — which is the
 * group table from the typography rework rather than what `defaultSystem`
 * builds. Supporting roles are real and worth having; they are something a
 * project adds, not something it is given, and writing guidance for groups no
 * workspace has would be documenting an intention.
 */
export const TYPE_GROUP_GUIDANCE: Readonly<Record<string, string[]>> = {
  display: [
    "Display is the size above the document — a landing page's first line, a number somebody is meant to read from across a room. It is a visual size applied to body copy and renders as a paragraph, not as a heading, so a page that opens with a display line still has exactly one `h1` below it.",
    "One display role, not a parallel set to the headings. Most projects use one or two display sizes, and a system that started with six would be asking every project to delete four.",
  ],
  h: [
    "The heading group is the document's outline, `h1` through `h6`, and each renders as the element its name says. That is the one place in the system where the role name and the HTML tag are the same thing, because a heading level is already a semantic decision rather than a visual one.",
    "Skipping a level to get a size is the mistake this group exists to prevent. If `h3` is the right size and `h2` is the right level, change the size on `h2` — the scale is what should move, not the outline.",
  ],
  body: [
    "Body is the size most people spend the most time reading, so it is chosen first and everything else is derived from it. It sits at the base step by definition: the ratio counts up and down from here.",
    "Everything else in the scale is measured from here. A supporting role is body with an adjustment — a step down, more weight, wider letter spacing — and recording that as a role rather than as a one-off is what keeps it moving when body moves.",
  ],
  label: [
    "`label` names something rather than saying it: a form label, an eyebrow above a title, the text on a badge, a link that acts as a button. One step under body, with a little more weight, because a name read at a glance needs the extra and a paragraph does not.",
    "It renders as a span rather than a paragraph. A label sits inside other content — beside a field, above a heading — and wrapping one in a paragraph puts a block where an inline run belongs.",
  ],
  caption: [
    "`caption` is the quietest text the system has: a byline, a figure caption, a timestamp, a note under a control. Two steps under body, at body's weight, because it is still prose and only the size should say it matters less.",
    "It is the floor of the scale and it is meant to be. Anything smaller fails the body-size validation for good reason, and text that has to be smaller than a caption to fit is usually text that should not be there.",
  ],
};

/**
 * Every role or group id the paragraphs name, for the test that keeps them
 * honest.
 *
 * Prose goes stale differently from data: nothing breaks, the paragraph just
 * describes a role that no longer exists, and it reads exactly as
 * authoritative as the ones that do.
 */
export function typographyGuidanceIds(): string[] {
  const prose = [
    ...TYPOGRAPHY_GUIDANCE.flatMap((block) => block.paragraphs),
    ...Object.values(TYPE_GROUP_GUIDANCE).flat(),
  ].join(" ");

  return [
    ...new Set(
      [...prose.matchAll(/`([^`]+)`/g)]
        .map((match) => match[1]!)
        /* Variables are checked against the export rather than against the
           role list, so they are filtered out here and asserted separately. */
        .filter((token) => !token.startsWith("--")),
    ),
  ];
}

/** Every variable the paragraphs name, checked against what the export emits. */
export function typographyGuidanceVariables(): string[] {
  const prose = [
    ...TYPOGRAPHY_GUIDANCE.flatMap((block) => block.paragraphs),
    ...Object.values(TYPE_GROUP_GUIDANCE).flat(),
  ].join(" ");

  return [
    ...new Set(
      [...prose.matchAll(/`(--[a-z0-9-]+)`/g)].map((match) => match[1]!),
    ),
  ];
}
