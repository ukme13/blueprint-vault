/**
 * What changed, newest first.
 *
 * Each entry is badged with its date, the studio version, and the workspace
 * file version current on that date. All three are facts this repository can
 * check, and tests check them: the newest entry's studio version against
 * `apps/playground/package.json`, and its file version against
 * `BLUEPRINT_WORKSPACE_FILE_VERSION`. So a release or a format bump with no
 * entry beside it fails rather than shipping quietly.
 *
 * The studio version exists because the file version alone could not tell
 * releases apart: several ship at the same schema. See
 * docs/journal/2026-09-23-studio-version.md.
 *
 * Content, kept apart from data like the rest of `content/`, and skipped by
 * the hardcoded-value scanner for the same reason: a changelog has to be able
 * to say 12% and 4px.
 *
 * See docs/roadmap/studio-guide.md.
 */

export interface ChangelogEntry {
  /** ISO, so it sorts and formats without a second opinion. */
  date: string;
  /**
   * The studio version, `major.minor.patch`. Entries before 0.2.0 carry
   * 0.1.0, which is what package.json and every handover said until then.
   */
  version: string;
  /** The workspace file version current on that date. */
  schema: number;
  title: string;
  changes: string[];
}

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: "2026-10-12",
    version: "0.4.0",
    schema: 8,
    title:
      "Accessibility Sandbox, Interactive Preview Inspector & APCA Contrast Engine",
    changes: [
      "The Accessibility tab opens on a sandbox: a full-bleed hero of a badge, a heading, a paragraph and a button, whose every colour can be picked. A press selects a layer (the background, the badge, the heading, the body or the button) with an outline, corner handles and a size tag such as `320 × 104 · Fill × Hug`. A badge or a button selects its fill first; Ctrl or Cmd click, a double click or Ctrl Enter goes into its text, and Escape lets go.",
      "A layer takes its colour from two places: a role of the semantic layer, which follows light and dark, or a primitive shade, which does not. A 50px control bar holds the target, the picker with Semantic and Primitive tabs and a search, a 25 to 950 ramp on a wide screen, and a Reset that puts every layer back on the roles the sandbox opened with.",
      "A card over the hero scores the selected pair as it changes: text on fill and fill on page. Each carries a mark drawn in the pair measured, a bold A for heading text, an a for body and small text and a square for a fill. A WCAG 2 | WCAG 3 toggle on the toolbar chooses the standard, WCAG 2.2 ratios or APCA Lc, and it re-words the hero's score and the whole report below it. A label is held to the line a label has, 4.5:1 or Lc 60, not body text's Lc 75.",
      "One rule for the figure shown and the figure judged: an Lc is judged as the whole number it shows, and a WCAG 2 ratio is shown cut to its places and never rounded up, so no figure sits beside a verdict that disagrees with it.",
      "The text colour on a fill is chosen by APCA, not by the WCAG 2 ratio, which leans toward black on a mid-tone. An orange, a purple or a blue now gets white where the ratio would have said black. The seeded label on a fill does the same: when no candidate clears both 4.5:1 and Lc 60, it is the one APCA reads best that still reaches 3:1, so a purple 500 secondary has a white label (Lc 74) and not a black one (Lc 35).",
      "The Preview page has an inspector: a Figma-style column, 317px wide, beside the page, and a bottom sheet on a phone. Select text, a button, a band, a card, the Popular tag, the newsletter field or the footer divider on the page and the column shows what it is made of. The selection is an outline in the studio's info tone, softened, with its size; pressing what is selected again, or Escape, lets go of it.",
      "The inspector offers each kind of element what it has: its copy, Auto layout (padding by axis or by side, and the gap of what lays children out), Appearance (radius, for all four corners or each, and opacity), Typography, Fill, Stroke and Effects. Every value is a token, not a free length. A list's Default row says the number the page draws, and the panel starts from what the page is drawn with: an outlined button shows its edge and a contained one its shadow.",
      "A stroke is drawn as an outline over the border it replaces, inside, centred or outside, so an element is the size it was whether it has an edge or not. An eye beside a stroke and an effect keeps it and stops it drawing, for a before and after.",
      "A button can be dressed Contained or Outlined in one edit: the action fill with its label and a light shadow, or no fill with plain text, an edge and no shadow. The label is derived from the fill until a label colour of its own is chosen, and Apply type to all buttons carries only the type role across the page.",
      "Everything the inspector sets is saved with the project, undone with the same Undo as the rest of the studio, and put back by Reset to default.",
      "White and black are primitives: a reserved static track in no palette, declared as `--color-white` and `--color-black` in every export, with a static group in the Design Tokens. A role can point at them, and the sandbox's Primitive tab opens with them.",
      "A WCAG 2 swatch stops warning at AA. It is red under 3:1 and amber from 3:1 to 4.5:1, which is large text and graphics only, and AAA is a grade in the shade's details and not a warning. An Info button beside the score says what it is held to.",
      "A spacing preset can bind layout uses of its own, and the navigation bar has one, `inset-nav-y`, for its vertical padding. A step is a multiple of the base unit, so a preset with an 8px unit used to double the bar: 64px of padding and 48px between links on Spacious / Editorial. The 8pt and Spacious presets now keep the bar at 16px of padding, with 24px and 32px between links.",
    ],
  },
  {
    date: "2026-09-28",
    version: "0.3.0",
    schema: 8,
    title: "Milestone v1.0: the foundation is complete",
    changes: [
      "Colour, semantic roles, typography, spacing, radius and elevation are all built, all exported and all documented. This is the milestone the studio was working towards; the version number stays below 1 until a client has built a product from a handover alone.",
      "Spacing has a preview made of real interface: a welcome card and a profile form, spending spacing three ways at once. Inset pads each card, Stack separates its blocks and Columns separates the cards, and each is set to a step of its own.",
      "The preview marks its spaces the way Figma's inspector does: padding hatched in blue, gaps in pink, each with a tag of its size. A switch hides the marks and leaves the spaces as they are.",
      "Density has presets, Compact 0.75×, Default 1× and Spacious 1.25×, beside the slider. Density moves the layout steps and leaves the fine grid alone; a fine step carries a lock to say so.",
      "The step list lives in the settings, one row per step, each with a box to keep or prune it. Pruning a step that a layout use points at moves that use to the nearest step still kept, so the export never names a variable it no longer writes. Values read in px or rem.",
      "Scale presets set the base unit and the kept steps in one pick: 8pt Standard Grid, 4pt Compact Grid, Tailwind v4 Harmonized, and Spacious / Editorial.",
      "Elevation works two ways. Simple tunes a style with a few sliders, the way Lightroom does: Distance, Softness, Spread and Opacity for a drop shadow, with their own sets for Inset, Neumorphic and Glow. Advanced edits the layers one by one, as Figma's effect stack does; a layer can be inner, hidden, or in a colour of its own.",
      "Each level is previewed on a card, a button and a dialog, over light and dark grounds, and copies as CSS. A moved slider offers to reset, and a double-click does the same.",
      "Preset pickers read like Figma's variable list: a borderless search that has focus as it opens, a hairline divider that runs edge to edge, and a quiet tint on the picked value.",
      "The spacing preview remembers its slots, its marks and its unit across pages and reloads. They are view settings, so none of them is an undo step.",
      "On a phone every studio ends with room under its last row, the selector sheets keep their search opaque over the shades, and elevation's light and dark grounds share the screen's width.",
    ],
  },
  {
    date: "2026-09-23",
    version: "0.2.0",
    schema: 8,
    title: "The studio has documentation",
    changes: [
      "These pages. Getting started, six guides and this changelog, written for whoever operates the studio rather than for whoever receives what it makes.",
      "They are not in a handover. A client receives a system, not a tool, and an automated check reads every byte of each archive to keep it that way.",
      "The documentation site gained a frame while it was at it: a sidebar, a contents column that follows the reading, and a footer.",
    ],
  },
  {
    date: "2026-09-22",
    version: "0.1.0",
    schema: 8,
    title: "Transparency reaches the documentation",
    changes: [
      "A transparent semantic reference is now described where it is documented, not only where it is edited. A 12% divider says 12%, and its swatch is drawn over a checker.",
      "The reference workspace moved from file version 5 to 8, so the foundation pages render transparency for real rather than describing a system that has none.",
      "New projects can start from a preset rather than always from the same violet and teal.",
      "Dialogs holding a name close on the backdrop again. The delete confirmation deliberately does not.",
    ],
  },
  {
    date: "2026-09-18",
    version: "0.1.0",
    schema: 8,
    title: "Preview frames and layout uses",
    changes: [
      "The workspace file went to version 8: preview frames and layout uses moved to the root of the document, so a set of breakpoints belongs to the project rather than to its typography.",
      "A file written at 7 is lifted on read and keeps its devices. A build that only knows 7 refuses a version 8 file, rather than silently dropping somebody's breakpoints.",
      "The Overview board, and the project library on Home.",
    ],
  },
  {
    date: "2026-09-12",
    version: "0.1.0",
    schema: 7,
    title: "Buttons, and a preview worth judging",
    changes: [
      "Button colour schemes are part of the workspace, so the studio's own controls are drawn from the system being built.",
      "The typography preview gained real templates — an article rather than a specimen — which is where a ratio that grows too fast finally shows itself.",
    ],
  },
  {
    date: "2026-09-06",
    version: "0.1.0",
    schema: 7,
    title: "Alpha, deletions that stick, and the handover",
    changes: [
      "Version 6: a semantic reference can carry an alpha. Version 7: a workspace remembers the seed roles it deliberately threw away, so opening it does not put them back.",
      "The documentation application reads a checked-in workspace and renders six foundation pages from it, installing the export the way a client's developer would.",
      "`pnpm handover` produces the whole deliverable: three export formats, the typography stylesheet, the workspace, the accessibility report in both formats, a README, and the foundation pages built against that workspace.",
    ],
  },
  {
    date: "2026-08-31",
    version: "0.1.0",
    schema: 5,
    title: "The rest of a system",
    changes: [
      "Versions 2 to 5, in one stretch: the semantic layer, then spacing, radius and elevation. A workspace stopped being a palette and became a design system.",
      "Each of those arrived as a slice a file could lack and gain on read, which is why a version 1 file still opens today.",
    ],
  },
];
