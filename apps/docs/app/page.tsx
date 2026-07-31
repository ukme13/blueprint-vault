import Link from "next/link";
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

const components = [
  {
    title: "Button",
    description:
      "Actions, links, loading states, icons, colour schemes, variants, and sizes.",
    href: "/docs/button",
    status: "Available",
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

      <section aria-labelledby="components-heading" className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2 id="components-heading">Components</h2>
          <p>
            Explore component behaviour, visual options, usage examples, and API
            details.
          </p>
        </div>

        <ul className={styles.grid}>
          {components.map((component) => (
            <li key={component.title}>
              <Link className={styles.componentCard} href={component.href}>
                <span className={styles.status}>{component.status}</span>
                <h3>{component.title}</h3>
                <p>{component.description}</p>
                <span className={styles.cardAction}>View component →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <aside className={styles.notice}>
        <h2>Documentation grows with the system</h2>
        <p>
          New guidance belongs here when a token, component, or pattern is
          stable enough for other products to use.
        </p>
      </aside>
    </main>
  );
}
