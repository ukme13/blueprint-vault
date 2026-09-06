/**
 * @type {import('next').NextConfig}
 *
 * Static export is opt-in through `BLUEPRINT_STATIC`, not always on.
 *
 * Every route here is static already — eight pages, no route handlers, no
 * dynamic segments, no `next/image`, no cookies or headers — so `output:
 * "export"` costs nothing to turn on. It is off by default because it also
 * turns off `next start`, which is what the screenshots and the local e2e
 * runs use.
 *
 * `trailingSlash` so every route lands as `dir/index.html`. A handover is
 * opened from a folder rather than served, and `foundations/colour.html`
 * has no predictable depth to make its asset paths relative from.
 */
const isStatic = process.env.BLUEPRINT_STATIC === "1";

const nextConfig = isStatic
  ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
  : {};

export default nextConfig;
