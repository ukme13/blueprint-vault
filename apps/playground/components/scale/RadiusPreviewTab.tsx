"use client";

import { useState, type CSSProperties } from "react";
import { Mic, Plus } from "lucide-react";
import { useThemeMode } from "../../app/theme-provider";
import {
  componentRadiusCss,
  layoutCssVariablesForDevice,
  paletteCssVariables,
  radiusCssVariables,
  semanticCssVariables,
  sortPreviewDevicesLargestFirst,
  type ColorTrack,
  type LayoutToken,
  type PreviewDevice,
  type RadiusScale,
  type SemanticToken,
} from "@blueprint/ui";
import { PreviewDeviceBar } from "../typography/PreviewDeviceBar";

const SUGGESTIONS = [
  "Summarize this article",
  "Rewrite this text",
  "Translate",
  "Explain",
] as const;

/*
 * The prompt panel: cream at the top to a soft orange at the bottom. Mixed
 * from the project's warning and error colours into its own surface, not
 * written as hex, so it stays a tint of the project and turns to a warm dark
 * in dark mode.
 */
const PANEL: CSSProperties = {
  backgroundImage:
    "linear-gradient(to bottom, color-mix(in oklch, var(--color-status-warning) 6%, var(--color-surface-base)), color-mix(in oklch, color-mix(in oklch, var(--color-status-warning) 65%, var(--color-status-error)) 22%, var(--color-surface-base)))",
};

/**
 * Every radius use on one piece of UI, on the frame you pick.
 *
 * The Uses table says which radius each use points at; this shows whether
 * they sit well together: the card on Surface radius, the chips on Chip, the
 * field on Input, and the buttons on Button: a text button, which Full turns
 * into a pill, beside a square icon button, which Full turns into a circle.
 * Minimal on purpose, white controls lifted by shadow on a grey stage with
 * almost no borders, so the corners are what the eye reads.
 *
 * Everything is scoped to this card the way the site preview scopes it: the
 * project's palette and semantic colours in the studio's current mode, its
 * radius scale, and its uses for the chosen frame. So the primary button is
 * the project's primary, not the studio's, and the studio around the card is
 * untouched.
 */
export function RadiusPreviewTab({
  devices,
  layout,
  palettes,
  radius,
  semantics,
}: {
  devices: readonly PreviewDevice[];
  layout: readonly LayoutToken[];
  palettes: ColorTrack[];
  radius: RadiusScale;
  semantics: SemanticToken[];
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

  const scopedStyle: CSSProperties = {
    ...paletteCssVariables(palettes),
    ...semanticCssVariables(semantics, mode, palettes),
    ...radiusCssVariables(radius),
    ...layoutCssVariablesForDevice(layout, device?.id ?? deviceId),
  };

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
          aria-label="Verba AI Preview"
          className="flex w-full max-w-md flex-col gap-6 border border-border-subtle/30 bg-surface-base p-6 shadow-xl"
          data-radius-sample="radius-surface"
          style={{ borderRadius: componentRadiusCss("radius-surface") }}
        >
          <header className="flex items-center justify-between gap-4 px-2 pt-2">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="m-0 text-2xl font-semibold text-fg-primary">
                Verba AI
              </h2>
              <p className="m-0 text-xs text-fg-muted">
                Your AI-powered text assistant.
              </p>
            </div>
            <button
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 border border-border-subtle/50 bg-surface-base px-3 py-1.5 text-xs font-medium text-fg-secondary shadow-xs transition-colors select-none hover:bg-surface-subtle"
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
            className="flex flex-col gap-4 rounded-container border border-border-subtle/50 p-5"
            style={PANEL}
          >
            <h3 className="m-0 mt-16 font-serif text-2xl font-medium text-fg-secondary">
              How can I help you?
            </h3>

            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    className="inline-flex cursor-pointer items-center border-0 bg-surface-base px-3.5 py-1.5 text-xs font-medium text-fg-secondary shadow-xs transition-all select-none hover:bg-surface-base/90"
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

            <div className="flex items-center gap-2">
              <input
                aria-label="Ask something"
                className="h-12 min-w-0 flex-1 border-0 bg-surface-base px-4 text-sm text-fg-primary shadow-sm placeholder:text-fg-muted focus:ring-1 focus:ring-fg-accent/20 focus:outline-none"
                data-radius-sample="radius-input"
                placeholder="Ask something..."
                style={{ borderRadius: componentRadiusCss("radius-input") }}
                type="text"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
              <button
                aria-label="Voice input"
                className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center border-0 bg-surface-base text-action-primary shadow-sm transition-all select-none hover:bg-surface-base/90"
                data-radius-sample="radius-button"
                style={{ borderRadius: componentRadiusCss("radius-button") }}
                type="button"
              >
                <Mic aria-hidden className="size-4" />
              </button>
              <button
                className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center border-0 bg-surface-base px-5 text-sm font-semibold text-action-primary shadow-sm transition-all select-none hover:bg-surface-base/90"
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
