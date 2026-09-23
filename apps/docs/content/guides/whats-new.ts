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
