import styles from "./semantic-table.module.css";

interface TransparencySwatchProps {
  colour: string;
  alpha: number;
}

/** A primitive colour over a visible transparency underlay. */
export function TransparencySwatch({ colour, alpha }: TransparencySwatchProps) {
  return (
    <span
      aria-hidden="true"
      className={styles.transparencySwatch}
      data-transparent={alpha < 1 || undefined}
    >
      <i style={{ backgroundColor: colour, opacity: alpha }} />
    </span>
  );
}
