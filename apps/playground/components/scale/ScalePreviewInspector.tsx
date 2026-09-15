"use client";

import type { ReactNode } from "react";
import {
  SCALE_PREVIEW_JOBS,
  missingScalePreviewTokens,
  scalePreviewVariable,
  type ElevationScale,
  type RadiusScale,
  type SpacingScale,
} from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

interface ScalePreviewInspectorProps {
  spacing: SpacingScale;
  radius: RadiusScale;
  elevation: ElevationScale;
  children: ReactNode;
}

export function ScalePreviewInspector({
  spacing,
  radius,
  elevation,
  children,
}: ScalePreviewInspectorProps) {
  const missing = missingScalePreviewTokens(SCALE_PREVIEW_JOBS, {
    spacing,
    radius,
    elevation,
  });

  return (
    <>
      <div className={styles.settingGroup}>
        <h2>Layout jobs</h2>
        <p className={styles.settingHint}>
          Painted with the live scale. Prune a step they use and the gap
          disappears.
        </p>
        <ol className={styles.previewJobList}>
          {SCALE_PREVIEW_JOBS.map((job) => {
            const lost = missing.filter((each) => each.jobId === job.id);
            return (
              <li key={job.id}>
                <strong>{job.name}</strong>
                <p>{job.description}</p>
                <p>
                  {job.tokens.map((token) => (
                    <code key={scalePreviewVariable(token)}>
                      {scalePreviewVariable(token)}
                    </code>
                  ))}
                </p>
                {lost.length > 0 && (
                  <p className={styles.previewMissing} role="status">
                    Missing {lost.map((each) => each.variable).join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {children}
    </>
  );
}
