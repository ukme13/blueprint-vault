import type { Metadata } from "next";
import { FoundationsFrame } from "../../../../components/FoundationsFrame";
import { SEMANTIC_TOKENS_GUIDANCE } from "../../../../content/guides/semantic-tokens";

export const metadata: Metadata = {
  title: "Semantic tokens and alpha",
  description:
    "Naming colours by what they are for, one reference per mode, and what transparency does to a contrast number.",
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
export default function SemanticTokensGuidePage() {
  return (
    <FoundationsFrame
      path="studio/guides/semantic-tokens"
      sections={SEMANTIC_TOKENS_GUIDANCE}
      summary={
        "A name, a reference per mode, and the percentage that makes a divider a divider."
      }
      title={"Semantic tokens and alpha"}
    />
  );
}
