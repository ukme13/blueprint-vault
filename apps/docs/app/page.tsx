import Link from "next/link";
import { docsRouteGroups } from "@blueprint/ui";
import { docsAudience } from "../lib/audience";
import styles from "./page.module.css";

/**
 * The front door, from the same route list the sidebar reads.
 *
 * The sections used to be written out here — three foundation cards with no
 * links and one component card with one. That was survivable while nothing
 * else listed the routes. It is not survivable now: this page's rendered text
 * travels in `index.txt` and `__next._full.txt`, which sit at the root of the
 * export and go into a client's archive whatever the route allowlist says. A
 * hand-written Studio card here would put the studio guide's route names into
 * a client's hands while every guide page was correctly held back — the
 * chunk leak again, through the one door the path guard cannot watch.
 *
 * So the groups come from `docsRouteGroups(docsAudience())`, and a client
 * build has no Studio section because the list it was handed has no Studio
 * rows in it.
 *
 * See docs/roadmap/studio-guide.md.
 */

/** What each section says under its heading. Prose, not data. */
const GROUP_BLURB: Record<string, string> = {
  Foundations: "Start with the shared rules that every Blueprint product uses.",
  Components:
    "Explore component behaviour, visual options, usage examples, and API details.",
  Studio:
    "How to drive the studio that produced this system. Not part of a handover.",
};

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

      {docsRouteGroups(docsAudience()).map((entry) => {
        const heading = `${entry.group.toLowerCase()}-heading`;
        return (
          <section
            aria-labelledby={heading}
            className={styles.section}
            key={entry.group}
          >
            <div className={styles.sectionHeading}>
              <h2 id={heading}>{entry.group}</h2>
              <p>{GROUP_BLURB[entry.group]}</p>
            </div>

            <ul className={styles.grid}>
              {entry.routes.map((route) => (
                <li key={route.path}>
                  <Link
                    className={styles.componentCard}
                    href={`/${route.path}`}
                  >
                    <h3>{route.label}</h3>
                    <p>{route.description}</p>
                    <span className={styles.cardAction}>Read →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

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
