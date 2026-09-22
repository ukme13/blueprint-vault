"use client";

import { useEffect, useState } from "react";
import { Text } from "@astryxdesign/core/Text";
import { headingSlug } from "../lib/sections";

/**
 * What is on this page, as links, with the section in view marked.
 *
 * A client component, and the only one this frame has. Everything else here
 * renders once at build time; a reader's scroll position is the one fact a
 * static page cannot know in advance.
 *
 * It takes headings rather than sections. A section carries `body`, which is a
 * rendered node, and a node cannot cross into a client component — so the
 * frame hands over the strings and keeps the nodes. That is also the whole of
 * what this needs.
 *
 * `IntersectionObserver` rather than a scroll listener, because the browser
 * already knows what is on screen and asking it on every scroll frame is how a
 * documentation page comes to drop frames. The margin box is the reference's:
 * a band across the upper third of the viewport, so a heading counts as
 * current when it reaches reading position rather than when it first appears.
 *
 * With no JavaScript — or before hydration — every link still works, because
 * they are anchors and the ids are in the HTML. Only the highlight is missing,
 * which is the right thing to lose first.
 */

interface PageNavProps {
  headings: readonly string[];
}

export function PageNav({ headings }: PageNavProps) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const sections = headings
      .map((heading) => document.getElementById(headingSlug(heading)))
      .filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        }
      },
      /* Percentages throughout, including the zeros. `0px` is a length and
         this application forbids writing one; it is also not a length here,
         it is a share of the viewport. */
      { rootMargin: "-20% 0% -70% 0%" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" className="page-nav">
      <p className="page-nav-title">
        <Text type="supporting" weight="semibold">
          On this page
        </Text>
      </p>
      <ul>
        {headings.map((heading) => {
          const id = headingSlug(heading);
          return (
            <li key={heading}>
              <a
                aria-current={id === current ? "true" : undefined}
                href={`#${id}`}
              >
                <Text type="label">{heading}</Text>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
