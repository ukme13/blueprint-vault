/**
 * The words on the colour pages.
 *
 * Content, kept apart from data on purpose. What a token is worth is written
 * by a person and changes when the rules change; what a token *is* comes from
 * the workspace and changes whenever somebody edits a shade. A page that mixed
 * them would need editing every time a client dropped their own file in.
 *
 * A TypeScript module rather than MDX, per the plan: the prose here is short
 * and structured, it gets types and a lint for free, and MDX is a dependency
 * and a build path to own the day somebody writes something long.
 *
 * Guidance names roles, never values. "Body text is `fg.primary` on
 * `surface.base`", not "body text is neutral 850 on neutral 100" — a reader
 * who retunes a track should not have to retune the prose. The role names in
 * here are checked against the seed set by a test, so a rename cannot leave a
 * paragraph pointing at a token that no longer exists.
 */

export interface GuidanceBlock {
  heading: string;
  paragraphs: string[];
}

/** The top of /foundations/colour. */
export const PRIMITIVE_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "What a track is",
    paragraphs: [
      "A track is one colour of the system, generated as a ramp of shades from a single source colour in OKLCH. Every shade in a track shares a hue and differs in lightness, so the whole ramp reads as one colour rather than as a set of colours that happen to be near each other.",
      "The tracks below are this workspace's. A different project has different ones, and the names are the project's own — they become the variable names in the file a developer installs.",
    ],
  },
  {
    heading: "The 25-interval grid",
    paragraphs: [
      "Shade names are numbers divisible by 25, and they are positions rather than measurements: 50 is the lightest shade a track guarantees and 950 the darkest. That guarantee is what lets a semantic role point at a number and keep working when somebody changes how many shades the ramp has.",
      "The recommended preset uses twenty of them, 25 and then 50 to 950 in steps of 50. A denser scale adds intermediate steps between the same two ends.",
    ],
  },
  {
    heading: "Do not build with these",
    paragraphs: [
      "Product code should name a role and not a shade. `action.primary` says what a colour is for, so it can be a different shade in light and dark and can move when the palette moves; `primary-500` says only how dark a colour is, and freezes both decisions at the moment it was typed.",
      "The page next door is the layer that does the naming. These are what it points at, listed here so a developer can see what a role resolved to and check a value by eye.",
    ],
  },
];

/**
 * Guidance under each group on /foundations/semantic.
 *
 * Keyed by the part of a role id before the dot, which is how the export
 * groups them too. A group with no entry renders its table and no prose,
 * which is the right failure: a group somebody added themselves has no
 * guidance anybody has written yet.
 */
export const SEMANTIC_GROUP_GUIDANCE: Readonly<Record<string, string[]>> = {
  action: [
    "`action.primary` is the fill of the thing you press. `action.secondary` is the fill of the one beside it that is not the main choice — two buttons in a dialog, not a quieter shade of one.",
    "`action.primary-hover`, `action.primary-active` and `action.muted` are the same accent under the pointer, pressed, and turned down behind a selected row. They are states of one control rather than three colours, which is why the accessibility report measures them against nothing: nobody reads two of them side by side.",
    "`action.neutral` is the button with nothing to say — black on a light page, white on a dark one, which is the one tone whose fill crosses the ramp rather than sitting on it. It is a tone like any other and not a mode: its two values live in the layer, so the quiet button is a decision you can edit here rather than a branch inside a component.",
    "Every tone carries seven roles under the same seven names: the fill, its hovered and pressed states, a soft surface and that surface hovered, a foreground for text on either, and a border. `fg.on-action` is the label on the primary fill — one per tone, chosen by measuring against the fill rather than by picking white and hoping.",
  ],
  surface: [
    "`surface.base` is the page. `surface.subtle` is a wash set into it — a well, a code block — and `surface.raised` is a card or panel lifted off it. `surface.overlay` is what sits over everything: a menu, a popover, a dialog.",
    "`surface.skeleton` and `surface.track` are the two decorative grounds: the block shown while content loads, and the groove of a slider or progress bar. They carry no text, so they are checked for contrast against what is next to them rather than for readability.",
  ],
  border: [
    "`border.default` is a divider or the edge of a control. `border.subtle` separates without drawing the eye and `border.muted` is the faintest rule the system has, for a line inside a surface that is already quiet.",
    "`border.strong` is the one meant to be noticed — a section rule, the edge of a card that has to read as an edge. Reach for it when a border is doing work, not when a border is only tidying.",
  ],
  fg: [
    "`fg.primary` is body text, headings and icons. `fg.secondary` is supporting text: captions, help, the second line of a list item. `fg.disabled` is a control that cannot be used, and it is a solid colour rather than an opacity, because fading text lets the surface behind it mix into a colour nobody chose and nothing measured.",
    "`fg.accent` is text in the accent colour — a link, an eyebrow, the label of a selected tab. It is not `action.primary`: that is a fill, and using a fill colour as text is how a link ends up at three to one on the canvas.",
    "`fg.on-action` is the label on a filled control. It is the only foreground whose background is not a surface, which is why the report measures it against `action.primary` rather than against the page.",
  ],
  focus: [
    "`focus.ring` is the focus indicator, and it is one token because a focus indicator that changes colour by context is one somebody has to learn twice. It is checked against both the colour it sits on and the colour it sits beside.",
  ],
  status: [
    "`status.success`, `status.warning`, `status.error` and `status.info` are the signals: a dot, a badge fill, the colour somebody reads meaning out of. Any two of them can appear side by side, so the report measures every pair for whether they stay distinct under colour-vision deficiencies.",
    "Each carries three more roles for the thing the signal goes on. `status.error-surface` is the ground of an alert, `status.error-fg` the text and icons on it, `status.error-border` its edge. Build an alert from those three rather than from the fill, which is too strong to put text on.",
    "Colour is never the only carrier of meaning here. A status role tells somebody who can see the difference; the words and the icon tell everybody else.",
  ],
};

/** Every role id these paragraphs name, for the test that keeps them honest. */
export function guidanceRoleIds(): string[] {
  const prose = [
    ...PRIMITIVE_GUIDANCE.flatMap((block) => block.paragraphs),
    ...Object.values(SEMANTIC_GROUP_GUIDANCE).flat(),
  ].join(" ");

  /* Role ids are the only backticked things in here shaped `group.name`, so
     the prose can be read for them rather than each mention being registered
     by hand — a list somebody maintains beside the prose is a list that goes
     stale the first time a paragraph is edited in a hurry. */
  return [
    ...new Set(
      [...prose.matchAll(/`([a-z]+\.[a-z-]+)`/g)].map((match) => match[1]!),
    ),
  ];
}
