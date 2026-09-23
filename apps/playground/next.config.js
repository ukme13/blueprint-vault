import { readFileSync } from "node:fs";

/**
 * The studio's version, read from this app's package.json at build time.
 *
 * The same file `scripts/handover.ts` reads, so an archive built from the
 * command line and one exported from the browser carry the same number. It is
 * read here, in Node, and handed to the bundle as one string: the export
 * dialog runs in the browser, which cannot read a file, and importing
 * package.json there would ship every dependency name to get one field.
 *
 * Through `env`, which Next marks legacy but still supports. The newer route
 * reads the process environment or `.env` files, and neither can derive a
 * value from package.json without a script in front of every command.
 */
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    STUDIO_VERSION: version,
  },
  /* Next's development badge sits bottom-left by default, which is exactly
     where the rail pins "Studio guide". Development only; a production build
     never shows it. */
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
