import {
  nestedRadii,
  type RadiusScale,
  type ResolvedRadius,
} from "@blueprint/ui";
import styles from "./overview.module.css";

function size(px: number): string {
  return `${Number(px.toFixed(1))}px`;
}

/**
 * One corner, with the smaller ones inside it. Each level draws its own
 * radius, so the specimen shows how the corners sit against each other: a
 * smaller one nested in a larger, down to the square one at the centre.
 */
function RadiusLevel({
  levels,
  depth = 0,
}: {
  levels: readonly ResolvedRadius[];
  depth?: number;
}) {
  const [token, ...inside] = levels;
  if (!token) return null;
  return (
    <div
      className={styles.radiusLevel}
      data-radius-level={token.id}
      data-tone={depth % 2 === 0 ? "raised" : "subtle"}
      style={{ borderRadius: token.px }}
    >
      <span className={styles.radiusLabel}>
        <span>{token.name}</span>
        <span className={styles.radiusSize}>{size(token.px)}</span>
      </span>
      {inside.length > 0 ? (
        <RadiusLevel depth={depth + 1} levels={inside} />
      ) : null}
    </div>
  );
}

/** The radius scale as corners nested inside each other, largest outermost. */
export function OverviewRadiusSpecimen({ scale }: { scale: RadiusScale }) {
  const levels = nestedRadii(scale);
  return (
    <section aria-label="Radius" className={styles.card} data-specimen="radius">
      <header className={styles.specimenHeader}>
        <h3 className={styles.specimenTitle}>Radius</h3>
        <span className={styles.specimenMeta}>Concentric nesting</span>
      </header>
      {levels.length > 0 ? (
        <RadiusLevel levels={levels} />
      ) : (
        <span className={styles.specimenMeta}>No radius tokens</span>
      )}
    </section>
  );
}
