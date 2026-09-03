"use client";

import { useState, type CSSProperties } from "react";
import {
  defaultElevationScale,
  defaultRadiusScale,
  defaultSpacingScale,
  generatePalettes,
  semanticCssVariables,
  elevationCssVariables,
  radiusCssVariables,
  spacingCssVariables,
  type ColourMode,
  type SemanticToken,
  useWorkspaceStore,
} from "@blueprint/ui";
import { usePaletteView } from "../palette/PaletteViewContext";
import { PreviewChrome } from "../PreviewChrome";

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

/** The tokens the page draws itself with, named once so the JSX stays honest. */
const SURFACE = "var(--color-surface-base)";
const RAISED = "var(--color-surface-raised)";
const BORDER = "var(--color-border-default)";
const TEXT = "var(--color-fg-primary)";
const TEXT_MUTED = "var(--color-fg-secondary)";
const ACTION = "var(--color-action-primary)";
const ACTION_SECONDARY = "var(--color-action-secondary)";
const FOCUS = "var(--color-focus-ring)";
const SUCCESS = "var(--color-status-success)";
const WARNING = "var(--color-status-warning)";
const ERROR = "var(--color-status-error)";
const INFO = "var(--color-status-info)";

/**
 * A spacing step as a length.
 *
 * Inline like the colours rather than through a Tailwind utility, for the same
 * reason: `p-4` reaches a measurement the scale did not give it, and the check
 * that keeps this page honest cannot tell that from a token.
 */
const space = (step: string) => `var(--spacing-${step})`;

/** A corner radius by the name of what it goes on, not by its size. */
const radius = (id: string) => `var(--radius-${id})`;

/** A shadow level, which is a whole box-shadow rather than one colour. */
const shadow = (id: string) => `var(--shadow-${id})`;

export function SystemPreview() {
  const { seen } = usePaletteView();
  /* The read, its timing and the SSR rule all live in the hook now. This page
     only shows what is stored. */
  const { project, hasLoaded } = useWorkspaceStore();
  const [mode, setMode] = useState<ColourMode>("light");

  const tokens: SemanticToken[] = project?.semantics ?? [];
  const palettes = project?.palette ? generatePalettes(project.palette) : [];
  /* Both families on the same element that uses them, for the reason below. */
  const variables = {
    ...semanticCssVariables(tokens, mode, palettes, seen),
    ...spacingCssVariables(project?.spacing ?? defaultSpacingScale()),
    ...radiusCssVariables(project?.radius ?? defaultRadiusScale()),
    ...elevationCssVariables(
      project?.elevation ?? defaultElevationScale(),
      palettes,
      mode,
    ),
  };

  if (hasLoaded && tokens.length === 0) {
    return (
      <main
        className="mx-auto max-w-2xl"
        style={{ paddingInline: space("6"), paddingBlock: space("16") }}
      >
        <h1 className="text-xl font-semibold">Nothing to preview yet</h1>
        <p
          className="text-sm"
          style={{ color: TEXT_MUTED, marginTop: space("2") }}
        >
          This page is drawn entirely from the semantic layer. Build a palette,
          then open the Semantics tab to see it here.
        </p>
      </main>
    );
  }

  return (
    <PreviewChrome
      mode={mode}
      name={project?.name ?? "Workspace"}
      tokenCount={tokens.length}
      onModeChange={setMode}
    >
      {/* The variables are declared on the same element that uses them.
          Declaring them on a child left this one resolving
          --color-surface-base against nothing, so the background fell back to
          transparent. */}
      <div
        className="flex-1"
        style={
          { ...variables, background: SURFACE, color: TEXT } as CSSProperties
        }
      >
        <main
          className="mx-auto flex max-w-4xl flex-col"
          style={{
            gap: space("10"),
            paddingInline: space("6"),
            paddingBlock: space("12"),
          }}
        >
          <section className="flex flex-col" style={{ gap: space("4") }}>
            <h1 className="text-4xl font-semibold tracking-tight">
              A system you can hand over
            </h1>
            <p className="max-w-2xl text-base" style={{ color: TEXT_MUTED }}>
              Every colour on this page comes from a semantic token. Change what
              a token points at and this page follows, in both modes.
            </p>
            <div className="flex flex-wrap" style={{ gap: space("3") }}>
              <button
                className="text-sm font-medium"
                style={{
                  borderRadius: radius("element"),
                  background: ACTION,
                  color: SURFACE,
                  paddingInline: space("4"),
                  paddingBlock: space("2"),
                }}
                type="button"
              >
                Primary action
              </button>
              <button
                className="text-sm font-medium"
                style={{
                  borderRadius: radius("element"),
                  background: ACTION_SECONDARY,
                  color: SURFACE,
                  paddingInline: space("4"),
                  paddingBlock: space("2"),
                }}
                type="button"
              >
                Secondary
              </button>
              <button
                className="border text-sm font-medium"
                style={{
                  borderRadius: radius("element"),
                  borderColor: BORDER,
                  color: TEXT,
                  paddingInline: space("4"),
                  paddingBlock: space("2"),
                }}
                type="button"
              >
                Tertiary
              </button>
            </div>
          </section>

          <section
            aria-label="Status messages"
            className="grid sm:grid-cols-2"
            style={{ gap: space("3") }}
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
                className="flex border"
                style={{
                  borderRadius: radius("container"),
                  borderColor: BORDER,
                  background: RAISED,
                  boxShadow: shadow("low"),
                  gap: space("3"),
                  padding: space("4"),
                }}
              >
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0"
                  style={{
                    borderRadius: radius("full"),
                    background: item.tone,
                    marginTop: space("1"),
                  }}
                />
                <div>
                  <h2 className="text-sm font-semibold">{item.title}</h2>
                  <p className="text-sm" style={{ color: TEXT_MUTED }}>
                    {item.body}
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section
            aria-label="Sign up"
            className="border"
            style={{
              borderRadius: radius("container"),
              borderColor: BORDER,
              background: RAISED,
              boxShadow: shadow("med"),
              padding: space("6"),
            }}
          >
            <h2 className="text-lg font-semibold">Stay in the loop</h2>
            <div
              className="flex flex-wrap"
              style={{ marginTop: space("4"), gap: space("3") }}
            >
              <input
                aria-label="Email address"
                className="min-w-0 flex-1 border text-sm outline-none focus:ring-2"
                placeholder="you@example.com"
                style={
                  {
                    borderColor: BORDER,
                    background: SURFACE,
                    color: TEXT,
                    borderRadius: radius("element"),
                    paddingInline: space("3"),
                    paddingBlock: space("2"),
                    "--tw-ring-color": FOCUS,
                  } as CSSProperties
                }
                type="email"
              />
              <button
                className="text-sm font-medium"
                style={{
                  borderRadius: radius("element"),
                  background: ACTION,
                  color: SURFACE,
                  paddingInline: space("4"),
                  paddingBlock: space("2"),
                }}
                type="button"
              >
                Subscribe
              </button>
            </div>
          </section>
        </main>
      </div>
    </PreviewChrome>
  );
}
