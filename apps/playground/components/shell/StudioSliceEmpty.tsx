"use client";

import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Button } from "@blueprint/ui";

/**
 * A leftover half-document: the workspace exists, this studio's slice does not.
 *
 * Home is the only create path. This fills the missing slice from the same
 * Blueprint seed, and it must not start a second project.
 */
export function StudioSliceEmpty({
  slice,
  onSeed,
}: {
  slice: "Colour" | "Typography";
  onSeed: () => void;
}) {
  return (
    <EmptyState
      headingLevel={1}
      title="This slice isn't open yet"
      description={`${slice} is empty in this workspace. Seed it from the Blueprint defaults, or go Home to start a new project.`}
      actions={
        <>
          <Button scheme="primary" size="small" onClick={onSeed}>
            Seed from Blueprint
          </Button>
          <Button href="/" scheme="neutral" size="small" variant="outlined">
            Home
          </Button>
        </>
      }
    />
  );
}
