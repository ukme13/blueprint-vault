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
 * The band cannot reach the last sections of a page: the page stops
 * scrolling before their headings climb that far. So at the bottom of the
 * page, within `BOTTOM_SLACK` of it, the last heading is current whatever
 * the band says, and a click marks its link at once rather than waiting for
 * the scroll to report.
 *
 * With no JavaScript — or before hydration — every link still works, because
 * they are anchors and the ids are in the HTML. Only the highlight is missing,
 * which is the right thing to lose first.
 */

/** How near the bottom of the page counts as at it, in CSS pixels. */
const BOTTOM_SLACK = 50;

function isAtPageBottom(): boolean {
  const page = document.documentElement;
  /* Only once the reader has scrolled: a page too short to scroll is at its
     bottom from the start, and there the first section is the right one. */
  return (
    window.scrollY > 0 &&
    window.innerHeight + window.scrollY >= page.scrollHeight - BOTTOM_SLACK
  );
}

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

    const last = sections[sections.length - 1]!.id;
    const observer = new IntersectionObserver(
      (entries) => {
        /* At the bottom the last section holds, even as an earlier heading
           passes through the band on the way down. */
        if (isAtPageBottom()) {
          setCurrent(last);
          return;
        }
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

    /* The one thing the observer cannot see: arriving at the bottom. A
       passive listener that only compares two numbers. */
    const onScroll = () => {
      if (isAtPageBottom()) setCurrent(last);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [headings]);

  if (headings.length === 0) return null;

  /* The first section until the observer says otherwise. At the top of a page
     the title and the lead fill the band this watches, so nothing intersects
     it and nothing was marked — a column of links with no current one, on the
     one screen where a reader can be certain where they are. Falling back to
     the first is what a reader would assume anyway. */
  const active = current ?? headingSlug(headings[0]!);

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
                aria-current={id === active ? "true" : undefined}
                href={`#${id}`}
                onClick={() => setCurrent(id)}
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
