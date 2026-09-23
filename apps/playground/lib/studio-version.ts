/**
 * The studio's version, as this build knows it.
 *
 * `next.config.js` reads it from this app's package.json at build time and
 * hands it over as `STUDIO_VERSION`, so the rail and the handover README show
 * the same number the changelog test holds package.json to. Read as a literal
 * property because that is the only form Next replaces.
 *
 * The fallback is "unknown" rather than a version: a hand-typed number here
 * would be exactly the second copy the changelog test cannot see, and it
 * would quietly lie the day package.json moves on. Missing means the build
 * skipped the config, which is worth seeing rather than hiding.
 */
export const STUDIO_VERSION = process.env.STUDIO_VERSION ?? "unknown";
