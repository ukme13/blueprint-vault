import type { Metadata } from "next";
import { FoundationsFrame } from "../../components/FoundationsFrame";
import { STUDIO_GUIDANCE } from "../../content/studio";

export const metadata: Metadata = {
  title: "Getting started",
  description:
    "What the Blueprint studio is for, where it keeps your work, and what each of its routes does.",
};

/**
 * The studio guide's front page.
 *
 * Internal only. It is in the route list with `audience: "internal"`, which
 * keeps it out of the nav a client build renders, out of the documentation
 * home page's sections, and out of the handover archive — three exclusions
 * from one row, and an archive check that reads every byte to confirm it.
 *
 * A thin page over a content module, which is how every page here is built
 * and, for a guide, is also what gets it past the hardcoded-value scanner:
 * prose is allowed to say 25 and 4px, JSX is not.
 *
 * See docs/roadmap/studio-guide.md.
 */
export default function StudioPage() {
  return (
    <FoundationsFrame
      path="studio"
      sections={STUDIO_GUIDANCE}
      summary="What the studio is for, where your work lives, and what each route does."
      title="Getting started"
    />
  );
}
