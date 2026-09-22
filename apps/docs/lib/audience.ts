import type { DocsAudience } from "@blueprint/ui";

/**
 * Who this build of the documentation is for.
 *
 * Read at build time, in server components, so the answer is baked into the
 * HTML and never reaches the browser bundle. That is deliberate: the question
 * is not "who is looking" but "what was built", and a client's archive must
 * not contain the other answer anywhere for a reader to find.
 *
 * Separate from `BLUEPRINT_STATIC`, which says what shape the output takes —
 * `output: "export"` or a server — and nothing about its audience. The two
 * coincide only because `scripts/handover.ts` happens to be the only caller
 * that sets either today. The internal site will be a static export as well,
 * and a nav keyed on the output format would hide the studio guide on exactly
 * the site that exists to carry it.
 *
 * See docs/roadmap/studio-guide.md.
 */
export function docsAudience(): DocsAudience {
  const value = process.env.BLUEPRINT_AUDIENCE;

  /* Unset is internal: local development, and any deployment that has not
     thought about it. A client build is the one that has to say so. */
  if (value === undefined || value === "") return "internal";
  if (value === "client" || value === "internal") return value;

  /* Anything else stops the build rather than falling back. The fallback is
     `internal`, and a misspelled `clientt` silently reaching that default
     would put the studio guide into a client's archive — the one failure this
     whole mechanism exists to prevent, arriving through a typo. */
  throw new Error(
    `BLUEPRINT_AUDIENCE is "${value}". It must be "client", "internal", or unset.`,
  );
}
