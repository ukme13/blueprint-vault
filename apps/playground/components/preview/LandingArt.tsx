import type { SVGProps } from "react";
import styles from "./landing.module.css";

type ArtProps = SVGProps<SVGSVGElement>;

export function BrandMark(props: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={styles.brandMark}
      viewBox="0 0 24 24"
      {...props}
    >
      <rect height="18" rx="5" width="18" x="3" y="3" />
      <path d="M8 16V9.5L12 14l4-4.5V16" />
    </svg>
  );
}

export function HeroArt(props: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={styles.art}
      viewBox="0 0 400 300"
      {...props}
    >
      <rect height="170" rx="12" width="250" x="40" y="40" />
      <path d="M40 76h250" />
      <circle className={styles.artSolid} cx="58" cy="58" r="3.5" />
      <circle
        className={`${styles.artFaint} ${styles.artSolid}`}
        cx="72"
        cy="58"
        r="3.5"
      />
      <circle
        className={`${styles.artFaint} ${styles.artSolid}`}
        cx="86"
        cy="58"
        r="3.5"
      />
      <path d="M64 178l38-44 32 26 38-58 34 44 30-30" />
      <path className={styles.artFaint} d="M64 196h172" />
      <rect
        className={styles.artFaint}
        height="110"
        rx="16"
        width="110"
        x="250"
        y="150"
      />
      <circle cx="305" cy="205" r="34" />
      <path d="M305 189v32M289 205h32" />
      <path className={styles.artFaint} d="M96 250h120M96 268h72" />
    </svg>
  );
}

export function SplitFitArt(props: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={styles.art}
      viewBox="0 0 400 280"
      {...props}
    >
      <rect height="160" rx="10" width="230" x="30" y="30" />
      <rect
        className={styles.artFaint}
        height="60"
        rx="6"
        width="86"
        x="52"
        y="54"
      />
      <path d="M66 100v-22M84 100v-34M102 100v-14M120 100v-28" />
      <path
        className={styles.artFaint}
        d="M160 62h78M160 80h58M160 98h78M160 116h42"
      />
      <path d="M52 134h186" />
      <rect
        className={styles.artSolid}
        height="20"
        rx="10"
        width="60"
        x="52"
        y="150"
      />
      <path
        className={styles.artFaint}
        d="M275 120h70a20 20 0 0 1 20 20v80a20 20 0 0 1-20 20h-70a20 20 0 0 1-20-20v-80a20 20 0 0 1 20-20z"
      />
      <circle cx="310" cy="180" r="26" />
      <path d="M310 154v-12M310 218v12M284 180h-12M336 180h12" />
    </svg>
  );
}

export function SplitSupportArt(props: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={styles.art}
      viewBox="0 0 400 280"
      {...props}
    >
      <circle className={styles.artFaint} cx="130" cy="120" r="70" />
      <circle cx="130" cy="104" r="26" />
      <path d="M92 168a38 38 0 0 1 76 0" />
      <circle cx="262" cy="96" r="34" />
      <circle cx="262" cy="86" r="13" />
      <path d="M244 124a18 18 0 0 1 36 0" />
      <circle className={styles.artFaint} cx="286" cy="196" r="46" />
      <path d="M286 176v40M266 196h40" />
      <path className={styles.artFaint} d="M180 150l56 24M196 96l36-8" />
    </svg>
  );
}
