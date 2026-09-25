"use client";

import { useState, type CSSProperties } from "react";
import { Mic } from "lucide-react";
import {
  componentRadiusCss,
  layoutCssVariablesForDevice,
  radiusCssVariables,
  sortPreviewDevicesLargestFirst,
  type LayoutToken,
  type PreviewDevice,
  type RadiusScale,
} from "@blueprint/ui";
import { PreviewDeviceBar } from "../typography/PreviewDeviceBar";

const SUGGESTIONS = [
  "Summarize this article",
  "Rewrite this text",
  "Translate",
  "Explain",
] as const;

/*
 * A soft wash behind the prompt, from the studio's own status colours mixed
 * into transparent: warm at the top corners, green low left, blue and violet
 * low right. Tokens rather than hex, so it follows the studio's light and
 * dark themes.
 */
const WASH: CSSProperties = {
  backgroundImage: [
    "radial-gradient(circle at 0% 30%, color-mix(in oklch, var(--color-status-error) 14%, transparent), transparent 45%)",
    "radial-gradient(circle at 100% 25%, color-mix(in oklch, var(--color-status-warning) 14%, transparent), transparent 40%)",
    "radial-gradient(circle at 15% 95%, color-mix(in oklch, var(--color-status-success) 18%, transparent), transparent 50%)",
    "radial-gradient(circle at 90% 75%, color-mix(in oklch, var(--color-status-info) 22%, transparent), transparent 50%)",
  ].join(", "),
};

/**
 * Every radius use on one piece of UI, on the frame you pick.
 *
 * The Uses table says which radius each use points at; this shows whether
 * they sit well together: the card on Surface radius, the chips on Chip, the
 * field on Input and the mic on Button. The variables are scoped to this card
 * the way the site preview scopes them, the project's radius scale and its
 * uses for the chosen frame, so the studio around it is untouched. The
 * colours are the studio's; the site preview is where the project's colours
 * are proved.
 */
export function RadiusPreviewTab({
  devices,
  layout,
  radius,
}: {
  devices: readonly PreviewDevice[];
  layout: readonly LayoutToken[];
  radius: RadiusScale;
}) {
  const ordered = sortPreviewDevicesLargestFirst(devices);
  const [deviceId, setDeviceId] = useState(
    ordered.find((device) => device.id === "desktop")?.id ??
      ordered[0]?.id ??
      "desktop",
  );
  const device = ordered.find((each) => each.id === deviceId) ?? ordered[0];
  const [prompt, setPrompt] = useState("");

  const scopedStyle: CSSProperties = {
    ...radiusCssVariables(radius),
    ...layoutCssVariablesForDevice(layout, device?.id ?? deviceId),
  };

  return (
    <section
      aria-label="Radius preview"
      className="flex min-h-0 flex-col items-center gap-6 overflow-auto p-6"
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
          className="flex w-full max-w-md flex-col gap-6 border border-border-subtle bg-surface-base p-6 shadow-lg"
          data-radius-sample="radius-surface"
          style={{ borderRadius: componentRadiusCss("radius-surface") }}
        >
          <header className="flex flex-col gap-1 px-2 pt-2">
            <h2 className="m-0 text-2xl font-semibold text-fg-primary">
              Verba AI
            </h2>
            <p className="m-0 text-xs text-fg-muted">
              Your AI-powered text assistant.
            </p>
          </header>

          <section
            aria-label="Assistant"
            className="flex flex-col gap-4 rounded-container border border-border-subtle bg-surface-raised p-5"
            style={WASH}
          >
            <h3 className="m-0 mt-16 font-serif text-2xl font-medium text-fg-secondary">
              How can I help you?
            </h3>

            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    className="inline-flex cursor-pointer items-center border border-border-subtle bg-surface-subtle px-3 py-1.5 text-xs text-fg-secondary transition-colors select-none hover:bg-surface-base"
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
                className="h-12 min-w-0 flex-1 border border-border-default bg-surface-base px-4 text-sm text-fg-primary shadow-sm placeholder:text-fg-muted focus:border-fg-accent focus:outline-none"
                data-radius-sample="radius-input"
                placeholder="Ask something..."
                style={{ borderRadius: componentRadiusCss("radius-input") }}
                type="text"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
              <button
                aria-label="Voice input"
                className="inline-flex size-12 shrink-0 items-center justify-center bg-action-primary text-fg-on-action shadow-sm transition-opacity hover:opacity-90"
                data-radius-sample="radius-button"
                style={{ borderRadius: componentRadiusCss("radius-button") }}
                type="button"
              >
                <Mic aria-hidden className="size-4" />
              </button>
            </div>
          </section>
        </article>
      </div>
    </section>
  );
}
