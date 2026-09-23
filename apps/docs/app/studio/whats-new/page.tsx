import type { Metadata } from "next";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { FoundationsFrame } from "../../../components/FoundationsFrame";
import { Prose } from "../../../components/Prose";
import { CHANGELOG } from "../../../content/guides/whats-new";
import { changelogBadge } from "../../../lib/changelog";

export const metadata: Metadata = {
  title: "What's new",
  description:
    "What changed in the Blueprint studio, dated and badged with the workspace file version current at the time.",
};

/**
 * The changelog.
 *
 * Internal only, like every page under `/studio`.
 *
 * Each entry becomes a section, so the contents column lists the releases and
 * a reader can link to one. The badge sits in the section body rather than in
 * the heading: a heading is the anchor text and the nav label, and "The studio
 * has documentation · 23 September 2026 · Schema v8" is not a nav label.
 *
 * See docs/roadmap/studio-guide.md.
 */
export default function WhatsNewPage() {
  return (
    <FoundationsFrame
      path="studio/whats-new"
      sections={CHANGELOG.map((entry) => ({
        heading: entry.title,
        body: (
          <VStack gap={3}>
            <Text color="secondary" type="supporting">
              {changelogBadge(entry)}
            </Text>
            <ul className="changelog-list">
              {entry.changes.map((change) => (
                <li key={change}>
                  <Prose>{change}</Prose>
                </li>
              ))}
            </ul>
          </VStack>
        ),
      }))}
      summary="What changed, newest first, badged with the workspace file version current at the time."
      title="What's new"
    />
  );
}
