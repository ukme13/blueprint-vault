import type { GuidanceBlock } from "./colour";

/**
 * The words on the spacing, radius and elevation pages.
 *
 * Content, kept apart from data, the same way the colour and typography
 * guidance is. What a token is worth is written by a person; what it *is*
 * comes from the workspace.
 *
 * One convention, and a test enforces it. A backticked token starting with
 * `--` is a variable a developer installs. Every other backticked token is a
 * token id — a spacing step, a radius name, an elevation level — and has to
 * exist in the workspace a new project starts from. Units and numbers are
 * written plainly, because backticking them would make them claim to be
 * tokens.
 *
 * Guidance names tokens, never values. "A card's corner is `--radius-container`",
 * not "a card's corner is 12px" — the number is the workspace's to change, and
 * a client who scales their radii should not have to rewrite the prose.
 */

/** The top of /foundations/spacing. */
export const SPACING_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "Spacing counts, it does not multiply",
    paragraphs: [
      "A type scale multiplies: each size is the one below times a ratio. A spacing scale does not. It is a base unit counted out in whole multiples, coarsening as it grows — which is what every scale in use does, Astryx's and Tailwind's and Material's alike, and it is the reason this is not the type maths reused.",
      "The difference is not academic. A ratio of 1.25 over a 4px base gives 4, 5, 6.25, 7.81, and nobody lays out a page on 6.25px. Counting gives 4, 8, 12, 16 — numbers that land on the same grid as everything drawn beside them.",
      "The steps are data rather than a formula. A generated ramp is somewhere to start and then it gets pruned: half steps near the bottom where 2px is a real difference, gaps at the top where two neighbouring sizes rarely both earn their place. That is why the list below has a `--spacing-0-5` at the bottom and nothing between `--spacing-8` and `--spacing-10`.",
    ],
  },
  {
    heading: "Reference the token, never the number",
    paragraphs: [
      "Product code names a step. `--spacing-4` says this is one unit of the system's rhythm; 16px says only what somebody typed the day they typed it, and it stops moving when the base unit does. Changing a base unit from 4 to 8 should re-space a whole product, and it can only do that if nothing wrote the answer down.",
      "This is the same rule the colour and type pages state, and it is the one most often broken here, because a measurement does not look like a decision. A hardcoded padding is exactly as much of a leak as a hardcoded hex.",
      "One exemption, stated rather than left implied: a hairline is not a token. A 1px border and the widths inside a media query are not part of anybody's spacing scale, and a rule that flagged them would be switched off within a week.",
    ],
  },
  {
    heading: "Spacing exports in rem",
    paragraphs: [
      "A step is written as rem so it grows when a reader raises their browser's font size. A layout that stayed in pixels while its text grew is a layout that gets tighter the more somebody needs it not to be.",
      "The rem is against the browser root rather than against the type scale's own base. A workspace with an 18px base still has 16px rems unless somebody changed the root, and spacing that assumed otherwise would be an eighth too large everywhere.",
    ],
  },
];

/** The top of /foundations/radius. */
export const RADIUS_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "Radii are named by use, not by size",
    paragraphs: [
      "There is no radius ramp here and no radius-2. A corner is named for the thing it belongs to: `inner` for something nested inside another rounded thing, `element` for a control, `container` for a card or a panel, `page` for the largest surfaces. That is the shape the colour layer took four stages to arrive at, so radius started there.",
      'A name says what changes together. Making every card rounder is one decision, and it stays one decision as long as nobody has written the number into a component. A numeric ramp would have needed somebody to decide afterwards which step meant "card", and that decision would have lived in the components rather than in the system.',
    ],
  },
  {
    heading: "One multiplier, and two things it does not touch",
    paragraphs: [
      "The named radii scale together from a single multiplier, which is how a client makes a whole system rounder or squarer without editing every value. The table below shows the result at the current multiplier.",
      "`none` and `full` sit outside it, because neither is a size. Zero scaled is still zero and half a pill is still a pill, so a multiplier applied to them would be a control that appears not to work. They are marked fixed rather than quietly excluded.",
    ],
  },
  {
    heading: "Radius exports in px",
    paragraphs: [
      "Unlike spacing, a corner does not grow with the reader's font size. A 4px radius that became 6px because somebody enlarged their text would be a different shape, not a more readable one — the corner is a property of the surface rather than of the words on it.",
    ],
  },
];

/** The top of /foundations/elevation. */
export const ELEVATION_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "A level is a stack, not a shadow",
    paragraphs: [
      "Each level is two shadows rather than one: a tight, close one that reads as contact, and a wider, softer one that reads as distance. A single shadow can be either but not both, which is why one blurred shadow looks like a smudge and two look like a raised surface.",
      "`--shadow-low` is a surface barely off the page — a hovered row, a sticky header. `--shadow-med` is a card or a panel that has been lifted. `--shadow-high` is what sits over everything: a menu, a popover, a dialog. Reach down the list rather than up: a page where several things claim to be the highest has no highest.",
    ],
  },
  {
    heading: "The colour is a reference and does not change",
    paragraphs: [
      "The shade a shadow is drawn from is a reference into the palette, held once rather than once per mode. Everything else in the system flips between light and dark; this deliberately does not.",
      "A shadow is the absence of light. Flipping it pale on a dark page draws a halo, which is a different effect with a different name and not what anybody asking for elevation wanted. What genuinely changes is strength: a dark surface swallows a shadow, so the same black needs more of it. So the colour is one reference and the opacity is per mode — which is what the table below shows twice.",
      'It points at a palette shade rather than at a semantic role, and that is the one place in the system where a primitive is the right answer. The semantic names say where a colour goes — a surface, a border, a foreground — and a shadow is cast rather than placed. There is no page element called "shadow" for a role to be named after.',
    ],
  },
  {
    heading: "What the exported file can and cannot carry",
    paragraphs: [
      "The exported value is a literal rgba, not a var(). CSS cannot take a custom property for one channel of a colour inside a box-shadow, so the shade is resolved on the way out and the reference does not survive into the file. That is why this page names the shade it came from: without it, a reader looking at the exported value has no route back to the palette.",
      "It is also why elevation appears in all three blocks of the exported file while spacing and radius appear once. Only elevation changes with the mode, and repeating the other two in a dark block would say that they might.",
    ],
  },
];

const ALL = [
  ...SPACING_GUIDANCE,
  ...RADIUS_GUIDANCE,
  ...ELEVATION_GUIDANCE,
].flatMap((block) => block.paragraphs);

/** Every token id the paragraphs name, for the test that keeps them honest. */
export function scaleGuidanceIds(): string[] {
  return [
    ...new Set(
      [...ALL.join(" ").matchAll(/`([^`]+)`/g)]
        .map((match) => match[1]!)
        .filter((token) => !token.startsWith("--")),
    ),
  ];
}

/** Every variable the paragraphs name, checked against what the export emits. */
export function scaleGuidanceVariables(): string[] {
  return [
    ...new Set(
      [...ALL.join(" ").matchAll(/`(--[a-z0-9-]+)`/g)].map(
        (match) => match[1]!,
      ),
    ),
  ];
}
