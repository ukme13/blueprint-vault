"use client";

import { useState, type CSSProperties } from "react";
import { Mic, Plus } from "lucide-react";
import { useThemeMode } from "../../app/theme-provider";
import { useGoogleFontsLink } from "../typography/use-google-fonts";
import { useLocalFonts } from "../typography/use-local-fonts";
import {
  componentRadiusCss,
  layoutCssVariablesForDevice,
  paletteCssVariables,
  radiusCssVariables,
  semanticCssVariables,
  sortPreviewDevicesLargestFirst,
  typeCssVariablesForDevice,
  type ColorTrack,
  type LayoutToken,
  type PreviewDevice,
  type RadiusScale,
  type SemanticToken,
  type TypographyProjectData,
} from "@blueprint/ui";
import { PreviewDeviceBar } from "../typography/PreviewDeviceBar";

const SUGGESTIONS = [
  "Summarize this article",
  "Rewrite this text",
  "Translate",
  "Explain",
] as const;

/*
 * The assistant panel: the project's subtle surface with a breath of its
 * primary at the top, fading out. Mixed from semantic tokens, not written as
 * hex, so it follows the project's primary and turns with the theme.
 */
const PANEL: CSSProperties = {
  backgroundImage:
    "linear-gradient(to bottom, color-mix(in oklch, var(--color-action-primary) 7%, var(--color-surface-subtle)), var(--color-surface-subtle) 70%)",
};

/**
 * Every radius use on one piece of UI, on the frame you pick.
 *
 * The Uses table says which radius each use points at; this shows whether
 * they sit well together: the card on Surface radius, the chips on Chip, the
 * field on Input, and the buttons on Button: a text button, which Full turns
 * into a pill, beside a square icon button, which Full turns into a circle.
 * Minimal on purpose: flat controls, no shadow inside the card and hairline
 * borders, on a grey stage, so the corners are what the eye reads. Ask is the
 * one filled primary, New chat the one outlined button. The composer is one
 * bar on Input radius, with the mic and Ask set inside it on Button radius,
 * so the field's corner and its buttons' corners are read together.
 *
 * Everything is scoped to this card the way the site preview scopes it: the
 * project's palette and semantic colours in the studio's current mode, its
 * radius scale, its uses for the chosen frame, and its type, with the body
 * role's font on the card and the display role's on the greeting. So the primary button is
 * the project's primary, not the studio's, and the studio around the card is
 * untouched.
 */
export function RadiusPreviewTab({
  devices,
  layout,
  palettes,
  radius,
  semantics,
  typography,
}: {
  devices: readonly PreviewDevice[];
  layout: readonly LayoutToken[];
  palettes: ColorTrack[];
  radius: RadiusScale;
  semantics: SemanticToken[];
  typography: TypographyProjectData;
}) {
  const { resolved: mode } = useThemeMode();
  const ordered = sortPreviewDevicesLargestFirst(devices);
  const [deviceId, setDeviceId] = useState(
    ordered.find((device) => device.id === "desktop")?.id ??
      ordered[0]?.id ??
      "desktop",
  );
  const device = ordered.find((each) => each.id === deviceId) ?? ordered[0];
  const [prompt, setPrompt] = useState("");
  const system = typography.system;
  /* The project's faces, Google or uploaded, so the card is set in them. */
  useGoogleFontsLink(system, undefined, 400);
  useLocalFonts(system);

  const scopedStyle = {
    ...paletteCssVariables(palettes),
    ...semanticCssVariables(semantics, mode, palettes),
    ...radiusCssVariables(radius),
    ...layoutCssVariablesForDevice(layout, device?.id ?? deviceId),
    ...(device
      ? typeCssVariablesForDevice(
          system,
          device,
          typography.unit,
          typography.remRootPx,
          devices,
        )
      : {}),
    /* By role, not by font: the body role is whichever font the project
       sets body text in. */
    fontFamily: "var(--font-body-family, inherit)",
    /* Astryx's theme sets every h1-h6 and p by these two, not by
       inheritance, and the studio points them at its own Inter. Pointed at
       the project's roles here, the card's headings and paragraphs follow the
       project too; the title is an h2, so it takes the h2 role. */
    "--font-family-body": "var(--font-body-family, inherit)",
    "--font-family-heading": "var(--font-h2-family, var(--font-body-family))",
  } as CSSProperties;

  return (
    <section
      aria-label="Radius preview"
      className="flex min-h-0 flex-col items-center gap-6 overflow-auto bg-surface-subtle p-6"
    >
      <header className="flex items-center gap-3">
        <PreviewDeviceBar
          activeId={device?.id ?? deviceId}
          devices={devices}
          onChange={setDeviceId}
        />
        {device && (
          <p className="m-0 text-xs text-fg-muted" data-radius-frame="">
            {device.name} · {device.widthPx}px
          </p>
        )}
      </header>

      <div className="flex w-full justify-center" style={scopedStyle}>
        <article
          aria-label="Blueprint AI Preview"
          className="flex w-full max-w-md flex-col gap-5 border border-border-subtle bg-surface-base p-6"
          data-radius-sample="radius-surface"
          style={{ borderRadius: componentRadiusCss("radius-surface") }}
        >
          <header className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="m-0 text-xl font-semibold tracking-tight text-fg-primary">
                Blueprint AI
              </h2>
              <p className="m-0 text-sm text-fg-muted">
                Your AI-powered text assistant.
              </p>
            </div>
            <button
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 border border-border-default bg-surface-base px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors select-none hover:bg-surface-subtle hover:text-fg-primary"
              data-radius-sample="radius-button"
              style={{ borderRadius: componentRadiusCss("radius-button") }}
              type="button"
              onClick={() => setPrompt("")}
            >
              <Plus aria-hidden className="size-3.5" />
              New chat
            </button>
          </header>

          <section
            aria-label="Assistant"
            className="flex flex-col gap-5 rounded-container border border-border-subtle p-5"
            style={PANEL}
          >
            <h3
              className="m-0 pt-2 text-2xl font-medium text-fg-primary"
              style={{
                fontFamily:
                  "var(--font-display-1-family, var(--font-body-family, serif))",
              }}
            >
              How can I help you?
            </h3>

            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    className="inline-flex cursor-pointer items-center border border-border-subtle bg-surface-base px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors select-none hover:border-border-default hover:bg-surface-raised hover:text-fg-primary"
                    data-radius-sample="radius-chip"
                    style={{ borderRadius: componentRadiusCss("radius-chip") }}
                    type="button"
                    onClick={() => setPrompt(suggestion)}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>

            <div
              className="flex items-center gap-1.5 border border-border-subtle bg-surface-base p-1.5 transition-colors focus-within:border-fg-accent"
              data-radius-sample="radius-input"
              style={{ borderRadius: componentRadiusCss("radius-input") }}
            >
              <input
                aria-label="Ask something"
                className="h-9 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none"
                placeholder="Ask something..."
                type="text"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
              <button
                aria-label="Voice input"
                className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent text-fg-muted transition-colors select-none hover:bg-surface-subtle hover:text-action-primary"
                data-radius-sample="radius-button"
                style={{ borderRadius: componentRadiusCss("radius-button") }}
                type="button"
              >
                <Mic aria-hidden className="size-4" />
              </button>
              <button
                className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center border-0 bg-action-primary px-4 text-sm font-semibold text-fg-on-action transition-opacity select-none hover:opacity-90"
                data-radius-sample="radius-button"
                style={{ borderRadius: componentRadiusCss("radius-button") }}
                type="button"
              >
                Ask
              </button>
            </div>
          </section>
        </article>
      </div>
    </section>
  );
}
