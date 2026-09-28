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
