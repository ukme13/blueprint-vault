"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
  COLOUR_MODES,
  COLOUR_VISION_DEFICIENCIES,
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_TYPOGRAPHY_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  colourVisionOptionLabel,
  generatePalettes,
  loadWorkspace,
  semanticCssVariables,
  type ColourMode,
  type ColourVisionDeficiency,
  type SemanticToken,
  type WorkspaceProject,
} from "@blueprint/ui";
import { usePaletteView } from "../palette/PaletteViewContext";
import { WorkspaceNav } from "../WorkspaceNav";

/**
 * The whole system on one page.
 *
 * Every colour here comes from a semantic token and nothing else. That rule is
 * what makes the page worth building: each place it would have to reach for a
 * primitive is a semantic token the layer is missing, so the page is how the
 * naming set gets argued rather than invented. `findPrimitiveColourUse` holds
 * it up, because a rule nothing checks lasts until the first hurried commit.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

function readWorkspace(): WorkspaceProject | null {
  try {
    return loadWorkspace({
      workspace: window.localStorage.getItem(WORKSPACE_STORAGE_KEY),
      legacyPalette: window.localStorage.getItem(LEGACY_PALETTE_STORAGE_KEY),
      legacyTypography: window.localStorage.getItem(
        LEGACY_TYPOGRAPHY_STORAGE_KEY,
      ),
    }).project;
  } catch {
    return null;
  }
}

/** The tokens the page draws itself with, named once so the JSX stays honest. */
const SURFACE = "var(--color-neutral-light)";
const RAISED = "var(--color-primary-soft)";
const BORDER = "var(--color-neutral-mid)";
const TEXT = "var(--color-neutral-dark)";
const ACTION = "var(--color-primary-action)";
const ACTION_SECONDARY = "var(--color-secondary-action)";
const FOCUS = "var(--color-primary-focus)";
const SUCCESS = "var(--color-success-action)";
const WARNING = "var(--color-warning-action)";
const ERROR = "var(--color-error-action)";
const INFO = "var(--color-info-action)";

export function SystemPreview() {
  const { seen, view, setDeficiency } = usePaletteView();
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [mode, setMode] = useState<ColourMode>("light");

  useEffect(() => {
    /* In an effect, not a state initializer: localStorage does not exist
       during SSR and reading it there desyncs hydration. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProject(readWorkspace());
    setHasLoaded(true);
  }, []);

  const tokens: SemanticToken[] = project?.semantics ?? [];
  const palettes = project?.palette ? generatePalettes(project.palette) : [];
  const variables = semanticCssVariables(tokens, mode, palettes, seen);

  if (hasLoaded && tokens.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-xl font-semibold">Nothing to preview yet</h1>
        <p className="mt-2 text-sm opacity-70">
          This page is drawn entirely from the semantic layer. Build a palette,
          then open the Semantics tab to see it here.
        </p>
      </main>
    );
  }

  return (
    /* The variables are declared on the same element that uses them. Declaring
       them on a child left this one resolving --color-neutral-light against
       nothing, so the page background fell back to transparent. */
    <div
      className="min-h-dvh"
      style={
        { ...variables, background: SURFACE, color: TEXT } as CSSProperties
      }
    >
      <>
        <header
          className="flex flex-wrap items-center gap-3 border-b px-6 py-3"
          style={{ borderColor: BORDER, background: SURFACE }}
        >
          <strong className="mr-auto text-sm">
            {project?.name ?? "Workspace"}
          </strong>
          <SegmentedControl
            label="Colour mode"
            size="sm"
            value={mode}
            onChange={(next) => setMode(next as ColourMode)}
          >
            {COLOUR_MODES.map((each) => (
              <SegmentedControlItem
                key={each}
                label={each === "light" ? "Light" : "Dark"}
                value={each}
              />
            ))}
          </SegmentedControl>
          <div className="w-56">
            <Selector
              label="Vision"
              isLabelHidden
              options={COLOUR_VISION_DEFICIENCIES.map((deficiency) => ({
                label: colourVisionOptionLabel(deficiency, view.severity),
                value: deficiency,
              }))}
              value={view.simulation === "normal" ? undefined : view.simulation}
              placeholder="Normal vision"
              onChange={(next) => setDeficiency(next as ColourVisionDeficiency)}
            />
          </div>
          <WorkspaceNav active="preview" />
        </header>

        <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
          <section className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold tracking-tight">
              A system you can hand over
            </h1>
            <p className="max-w-2xl text-base opacity-80">
              Every colour on this page comes from a semantic token. Change what
              a token points at and this page follows, in both modes.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded px-4 py-2 text-sm font-medium"
                style={{ background: ACTION, color: SURFACE }}
                type="button"
              >
                Primary action
              </button>
              <button
                className="rounded px-4 py-2 text-sm font-medium"
                style={{ background: ACTION_SECONDARY, color: SURFACE }}
                type="button"
              >
                Secondary
              </button>
              <button
                className="rounded border px-4 py-2 text-sm font-medium"
                style={{ borderColor: BORDER, color: TEXT }}
                type="button"
              >
                Tertiary
              </button>
            </div>
          </section>

          <section
            aria-label="Status messages"
            className="grid gap-3 sm:grid-cols-2"
          >
            {[
              {
                tone: SUCCESS,
                title: "Saved",
                body: "Everything is up to date.",
              },
              {
                tone: WARNING,
                title: "Check this",
                body: "One pair is close.",
              },
              { tone: ERROR, title: "Failed", body: "Contrast is below AA." },
              { tone: INFO, title: "Note", body: "Simulation is guidance." },
            ].map((item) => (
              <article
                key={item.title}
                className="flex gap-3 rounded border p-4"
                style={{ borderColor: BORDER, background: RAISED }}
              >
                <span
                  aria-hidden="true"
                  className="mt-1 size-3 shrink-0 rounded-full"
                  style={{ background: item.tone }}
                />
                <div>
                  <h2 className="text-sm font-semibold">{item.title}</h2>
                  <p className="text-sm opacity-75">{item.body}</p>
                </div>
              </article>
            ))}
          </section>

          <section
            aria-label="Sign up"
            className="rounded border p-6"
            style={{ borderColor: BORDER, background: RAISED }}
          >
            <h2 className="text-lg font-semibold">Stay in the loop</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <input
                aria-label="Email address"
                className="min-w-0 flex-1 rounded border px-3 py-2 text-sm outline-none focus:ring-2"
                placeholder="you@example.com"
                style={
                  {
                    borderColor: BORDER,
                    background: SURFACE,
                    color: TEXT,
                    "--tw-ring-color": FOCUS,
                  } as CSSProperties
                }
                type="email"
              />
              <button
                className="rounded px-4 py-2 text-sm font-medium"
                style={{ background: ACTION, color: SURFACE }}
                type="button"
              >
                Subscribe
              </button>
            </div>
          </section>
        </main>

        <footer
          className="border-t px-6 py-6 text-sm opacity-70"
          style={{ borderColor: BORDER }}
        >
          Drawn from {tokens.length} semantic tokens, in {mode} mode.
        </footer>
      </>
    </div>
  );
}
