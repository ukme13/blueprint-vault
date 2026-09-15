"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  SCALE_PREVIEW_JOBS,
  elevationCssVariables,
  radiusCssVariables,
  scalePreviewValue,
  semanticCssVariables,
  spacingCssVariables,
  type ColorTrack,
  type ElevationScale,
  type RadiusScale,
  type SemanticToken,
  type SpacingScale,
} from "@blueprint/ui";
import { useThemeMode } from "../../app/theme-provider";
import styles from "./scale-workspace.module.css";

const SURFACE = "var(--color-surface-base)";
const RAISED = "var(--color-surface-raised)";
const BORDER = "var(--color-border-default)";
const TEXT = "var(--color-fg-primary)";
const MUTED = "var(--color-fg-secondary)";
const ACTION = "var(--color-action-primary)";

const space = (step: number) => scalePreviewValue({ family: "spacing", step });
const radius = (id: string) => scalePreviewValue({ family: "radius", id });
const shadow = (id: string) => scalePreviewValue({ family: "elevation", id });

interface ScalePreviewCanvasProps {
  spacing: SpacingScale;
  radius: RadiusScale;
  elevation: ElevationScale;
  palettes: ColorTrack[];
  semantics: SemanticToken[];
}

/**
 * Layout jobs painted with the live scale.
 *
 * Keep each scene's measurements in step with `SCALE_PREVIEW_JOBS`: a token
 * named there and not used here is a lie, and a measurement used here and not
 * named there will not warn when it is pruned.
 */
export function ScalePreviewCanvas({
  spacing,
  radius: radiusScale,
  elevation,
  palettes,
  semantics,
}: ScalePreviewCanvasProps) {
  const { resolved: mode } = useThemeMode();
  const variables = {
    ...semanticCssVariables(semantics, mode, palettes),
    ...spacingCssVariables(spacing),
    ...radiusCssVariables(radiusScale),
    ...elevationCssVariables(elevation, palettes, mode),
    background: SURFACE,
    color: TEXT,
  } as CSSProperties;

  return (
    <section
      aria-label="Layout preview"
      className={styles.previewStage}
      style={variables}
    >
      <PreviewJob id="section">
        <section aria-label="Section" style={{ paddingBlock: space(10) }}>
          <h2 className={styles.previewHeading}>A system you can hand over</h2>
          <p className={styles.previewBody} style={{ marginTop: space(4) }}>
            Neighbouring steps look different as bars. This gap is how they read
            as padding.
          </p>
          <p
            className={styles.previewBody}
            style={{ color: MUTED, marginTop: space(12) }}
          >
            What follows.
          </p>
        </section>
      </PreviewJob>

      <PreviewJob id="card">
        <article
          aria-label="Resting card"
          className={styles.previewPanel}
          style={{
            background: RAISED,
            borderColor: BORDER,
            borderRadius: radius("container"),
            boxShadow: shadow("low"),
            padding: space(4),
          }}
        >
          <h3 className={styles.previewHeading}>Resting card</h3>
          <p className={styles.previewBody} style={{ marginTop: space(2) }}>
            A container holding an element, and a chip inside that.
          </p>
          <div
            className={styles.previewRow}
            style={{ marginTop: space(3), gap: space(2) }}
          >
            <button
              className={styles.previewButton}
              style={{
                background: ACTION,
                borderRadius: radius("element"),
                color: SURFACE,
                paddingBlock: space(2),
                paddingInline: space(4),
              }}
              type="button"
            >
              Primary
            </button>
            <span
              className={styles.previewChip}
              style={{
                borderColor: BORDER,
                borderRadius: radius("inner"),
                paddingBlock: space(1),
                paddingInline: space(2),
              }}
            >
              Inner
            </span>
          </div>
        </article>
      </PreviewJob>

      <PreviewJob id="form">
        <section
          aria-label="Form row"
          className={styles.previewPanel}
          style={{
            background: RAISED,
            borderColor: BORDER,
            borderRadius: radius("container"),
            boxShadow: shadow("med"),
            padding: space(6),
          }}
        >
          <h3 className={styles.previewHeading}>Stay in the loop</h3>
          <div
            className={styles.previewRow}
            style={{ marginTop: space(4), gap: space(3) }}
          >
            <input
              aria-label="Email address"
              className={styles.previewInput}
              placeholder="you@example.com"
              style={{
                background: SURFACE,
                borderColor: BORDER,
                borderRadius: radius("element"),
                color: TEXT,
                paddingBlock: space(2),
                paddingInline: space(3),
              }}
              type="email"
            />
            <button
              className={styles.previewButton}
              style={{
                background: ACTION,
                borderRadius: radius("element"),
                color: SURFACE,
                paddingBlock: space(2),
                paddingInline: space(4),
              }}
              type="button"
            >
              Subscribe
            </button>
          </div>
        </section>
      </PreviewJob>

      <PreviewJob id="stack">
        <section
          aria-label="Elevation stack"
          className={styles.previewRow}
          style={{ gap: space(6) }}
        >
          {(
            [
              ["low", "Low"],
              ["med", "Medium"],
              ["high", "High"],
            ] as const
          ).map(([id, name]) => (
            <article
              key={id}
              aria-label={name}
              className={`${styles.previewPanel} ${styles.previewLift}`}
              style={{
                background: RAISED,
                borderColor: BORDER,
                borderRadius: radius("container"),
                boxShadow: shadow(id),
                padding: space(4),
              }}
            >
              <h3 className={styles.previewHeading}>{name}</h3>
              <p className={styles.previewBody} style={{ color: MUTED }}>
                The same card, a different shadow.
              </p>
            </article>
          ))}
        </section>
      </PreviewJob>
    </section>
  );
}

function PreviewJob({
  id,
  children,
}: {
  id: (typeof SCALE_PREVIEW_JOBS)[number]["id"];
  children: ReactNode;
}) {
  const job = SCALE_PREVIEW_JOBS.find((each) => each.id === id);
  if (!job) return null;

  return (
    <div className={styles.previewJob}>
      <h2 className={styles.previewJobName}>{job.name}</h2>
      {children}
    </div>
  );
}
