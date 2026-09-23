import type { Metadata } from "next";
import { FoundationsFrame } from "../../../../components/FoundationsFrame";
import { TYPOGRAPHY_GUIDE_GUIDANCE } from "../../../../content/guides/typography";

export const metadata: Metadata = {
  title: "Typography",
  description:
    "Three numbers make a scale; roles make it useful. Fonts, line height, and judging a scale in two scripts.",
};

/**
 * Internal only, like every page under `/studio`.
 *
 * A thin page over a content module, which is how every page here is built
 * and, for a guide, is also what gets it past the hardcoded-value scanner:
 * prose is allowed to say 4.5 and 12%, JSX is not.
 *
 * See docs/roadmap/studio-guide.md.
 */
export default function TypographyGuidePage() {
  return (
    <FoundationsFrame
      path="studio/guides/typography"
      sections={TYPOGRAPHY_GUIDE_GUIDANCE}
      summary={
        "How the scale is generated, how roles sit on it, and what the previews are for."
      }
      title={"Typography"}
    />
  );
}
