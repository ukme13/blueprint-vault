import type { GuidanceBlock } from "./colour";

/**
 * The words on /studio.
 *
 * Content, kept apart from data, the same way the foundation guidance is —
 * and here for a second reason as well. The hardcoded-value scanner runs over
 * this application with an empty allowlist, and a guide is largely made of the
 * things it forbids: a sentence about the 25-interval grid has to be able to
 * say 25, and one about spacing has to be able to say 4px. `content/` is
 * skipped because a content module is prose. A guide written as JSX with those
 * numbers inline would fail the scan, and the fix at that point is a rewrite.
 *
 * Unlike the foundation guidance, nothing here is checked against a workspace.
 * These pages describe a tool rather than a system, so there is no data to
 * disagree with — which also means nothing will tell us when a sentence goes
 * stale. Written against the studio as it is, and worth re-reading whenever a
 * route moves.
 *
 * See docs/roadmap/studio-guide.md.
 */

/** The top of /studio. */
export const STUDIO_GUIDANCE: GuidanceBlock[] = [
  {
    heading: "What this is",
    paragraphs: [
      "Blueprint is a studio for building a design system and handing it over. You give it a few source colours, a typeface and a ratio; it generates a palette, a semantic layer, a type scale and three scales of spacing, radius and elevation, and then it packs the whole thing into an archive somebody else can install.",
      "The thing worth understanding first is that it generates rather than stores. A shade is not a hex somebody picked and saved — it is a position on a ramp, computed in OKLCH from a source colour and a lightness target. Move the source and every shade that depends on it moves with it, in every export, on every page of the documentation. That is the point of the whole tool, and almost every surprise in it comes from forgetting it.",
      "The documentation you are reading is the other half. These foundation pages are built from a workspace file and go into the handover with the stylesheets, so a client reads about the system they were actually given rather than about Blueprint in general.",
    ],
  },
  {
    heading: "It runs in your browser and nowhere else",
    paragraphs: [
      "There is no account, no server and no sync. The studio has no API routes at all, and that is a rule rather than a stage nobody got to — a feature that needs one has to argue for being the first.",
      "Your work lives in this browser's local storage, under one key per workspace, with a list of them beside it. An uploaded font file goes into IndexedDB, because a font is too big for local storage and is also the one thing here we must never put in an export — a licensed typeface is not ours to redistribute, and a guard test makes sure no export path can emit font data.",
      "What follows from that is worth being blunt about: clearing site data deletes your systems, and a workspace does not follow you to another machine or another browser. The defence is the file. Export a Blueprint project, keep it where you keep your other work, and import it anywhere. That file is the real document; the browser is a place you happen to be editing it.",
      "The library holds eight workspaces. When it is full, the studio says so rather than quietly dropping the oldest.",
    ],
  },
  {
    heading: "The nine routes",
    paragraphs: [
      "Home is the library: every workspace you have, with the current one outlined, plus creating, importing, renaming and deleting. Creating asks for a name and a starting point and then lands you on Colour.",
      "Colour is where a system begins. Source colours become tracks, each generated as a ramp across the stable 25-interval grid. You can rename a track, edit a shade directly, or promote an edit to an anchor — an exact colour the ramp has to pass through, with the rest of the row blended smoothly around it. That is how a brand's real hex survives contact with a generated palette. The Semantics tab over the same data is the layer that gives those shades names like foreground primary and surface raised, one reference per mode, so a name carries a light value and a dark one and follows the shade it points at.",
      "Typography generates a modular scale from a base size, a ratio and a step count, then maps the steps onto roles you can add and group. Weight, line height and letter spacing are per role, per device where you need it. Previews are real text in English and Thai, because a scale that only ever holds Latin has not been tested.",
      "Spacing, Radius and Elevation are three routes over the third of a system that is not colour or type. Spacing counts a base unit rather than multiplying it. Radius tokens are named by use rather than by size, so a change of shape moves every card at once. Elevation levels are composite shadows drawn from one shade, with opacity held separately per mode, because a dark surface swallows a shadow that reads perfectly on a light one.",
      "Preview draws a whole page out of the semantic layer only, and is forbidden to touch a primitive — a test proves it. It is the page that finds the roles a system is missing, because a real layout asks for things a table of names does not. Overview is the same system as a board: ramps, type hierarchy, buttons and controls at a glance, for the moment you want to see whether it hangs together rather than whether one number is right.",
      "The ninth route, /scale, is a leftover. It redirects to Spacing, which used to live under it.",
    ],
  },
  {
    heading: "Changes, and undoing them",
    paragraphs: [
      "Edits apply as you make them; there is no save button, because there is nothing to save to. Undo and redo work per studio with the usual keys, and they undo a document step rather than a keystroke — typing into a field and moving on is one step, not eleven.",
      "A guarded reset is available where a change is destructive enough to deserve one, such as dropping every manual shade edit on a track. Those prompts are the one kind of dialog a stray click does not dismiss.",
    ],
  },
  {
    heading: "Getting a system out",
    paragraphs: [
      "Export offers CSS custom properties, a Tailwind theme block, DTCG design tokens, a Blueprint project file, an accessibility report in Markdown or JSON, and the handover archive. Colour values can be written as hex, OKLCH or RGB, and the choice is shared across the studio so a picker and an export never disagree.",
      "The archive is the deliverable. It holds the three export formats, the typography stylesheet, the workspace itself, the accessibility report in both formats, a README naming every file and which to install, and these foundation pages built statically against your workspace. It opens from a folder with nothing running.",
      "A client receives a system, not a tool. The guide you are reading is not in that archive, and an automated check reads every byte of each one to make sure it stays that way.",
    ],
  },
];
