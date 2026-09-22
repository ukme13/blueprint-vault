import type { Metadata } from "next";
import { FoundationsFrame } from "../../../../components/FoundationsFrame";
import { EXPORT_GUIDANCE } from "../../../../content/guides/export";

export const metadata: Metadata = {
  title: "Export and handover",
  description:
    "Five formats, the one file that is your work, and the archive a client receives.",
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
export default function ExportGuidePage() {
  return (
    <FoundationsFrame
      path="studio/guides/export"
      sections={EXPORT_GUIDANCE}
      summary={
        "What each format is for, which file is the one to keep, and what a client is handed."
      }
      title={"Export and handover"}
    />
  );
}
