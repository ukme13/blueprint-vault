import type { CSSProperties } from "react";
import {
  radiusUseSamples,
  type LayoutToken,
  type PreviewDevice,
  type RadiusSample,
  type RadiusScale,
} from "@blueprint/ui";

/**
 * Each radius use drawn as the thing it goes on, at real size, per frame.
 *
 * A number in a table does not show what a 9999px button looks like beside
 * an 8px input. These redraw as the table changes, one row per preview
 * frame in the table's column order, so a choice for Desktop is seen on
 * Desktop. The studio's own colours, not the project's: this is about the
 * corner, and the preview is where the project's colours are proved.
 */
export function RadiusUseSamples({
  columns,
  radius,
  tokens,
}: {
  columns: readonly PreviewDevice[];
  radius: RadiusScale;
  tokens: readonly LayoutToken[];
}) {
  return (
    <section
      aria-label="Radius samples"
      className="flex flex-col gap-4 rounded-container border border-border-subtle bg-surface-raised p-4"
    >
      <h3 className="m-0 text-sm font-semibold text-fg-primary">Samples</h3>
      {columns.map((device) => (
        <div
          key={device.id}
          className="flex flex-col gap-2"
          data-radius-samples={device.id}
        >
          <p className="m-0 text-xs text-fg-muted">
            {device.name} · {device.widthPx}px
          </p>
          <ul className="m-0 flex list-none flex-wrap items-end gap-4 p-0">
            {radiusUseSamples(tokens, device.id, radius).map((sample) => (
              <li key={sample.id} className="flex flex-col items-start gap-1">
                <Sample sample={sample} />
                <span className="text-xs text-fg-muted">
                  {sample.name} · {sample.px}px
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Sample({ sample }: { sample: RadiusSample }) {
  const style: CSSProperties = { borderRadius: `${sample.px}px` };
  const shared = "inline-flex items-center border";
  switch (sample.shape) {
    case "button":
      return (
        <span
          className={`${shared} h-9 border-transparent bg-action-primary px-4 text-sm font-medium text-fg-on-action`}
          data-radius-sample={sample.id}
          style={style}
        >
          Button
        </span>
      );
    case "input":
      return (
        <span
          className={`${shared} h-9 w-40 border-border-default bg-surface-base px-3 text-sm text-fg-muted`}
          data-radius-sample={sample.id}
          style={style}
        >
          Input
        </span>
      );
    case "chip":
      return (
        <span
          className={`${shared} h-6 border-border-subtle bg-surface-subtle px-2 text-xs text-fg-secondary`}
          data-radius-sample={sample.id}
          style={style}
        >
          Chip
        </span>
      );
    case "card":
      return (
        <span
          className={`${shared} h-20 w-36 items-end border-border-subtle bg-surface-base p-3 text-xs text-fg-secondary`}
          data-radius-sample={sample.id}
          style={style}
        >
          Card
        </span>
      );
    default:
      return (
        <span
          aria-hidden
          className={`${shared} size-10 border-border-default bg-surface-base`}
          data-radius-sample={sample.id}
          style={style}
        />
      );
  }
}
