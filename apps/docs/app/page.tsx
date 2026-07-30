import styles from "./page.module.css";

const foundations = [
  {
    title: "Colour tokens",
    description:
      "OKLCH primitive scales use stable 25-interval names from 50 to 950.",
  },
  {
    title: "Semantic tokens",
    description:
      "Shared foreground, background, border, accent, and status tokens explain how colour is used.",
  },
  {
    title: "Astryx bridge",
    description:
      "Blueprint semantic tokens map to Astryx theme variables so both systems use the same decisions.",
  },
];

export default function Page() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Blueprint design system</p>
        <h1>Documentation</h1>
        <p className={styles.introduction}>
          Guidance for using Blueprint tokens, shared components, and
          application patterns. This documentation is being built alongside the
          design system.
        </p>
      </header>

      <section aria-labelledby="foundations-heading" className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2 id="foundations-heading">Foundations</h2>
          <p>Start with the shared rules that every Blueprint product uses.</p>
        </div>

        <ul className={styles.grid}>
          {foundations.map((foundation) => (
            <li className={styles.card} key={foundation.title}>
              <h3>{foundation.title}</h3>
              <p>{foundation.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <aside className={styles.notice}>
        <h2>Documentation status</h2>
        <p>
          Button documentation still lives in the playground at{" "}
          <code>/docs/button</code>. It will move here during the next
          repository-structure phase.
        </p>
      </aside>
    </main>
  );
}
