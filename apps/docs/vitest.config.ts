import { defineConfig } from "vitest/config";

/**
 * Unit tests for this application, which the repository's testing strategy
 * does not otherwise ask for: Vitest lives in packages/ui and Playwright in
 * the apps.
 *
 * The exception is deliberate and narrow. The foundation pages are templates
 * over a workspace, and the only way to check that a template is a template is
 * to render it twice against different data and see the output move. That test
 * has to live where the components do.
 *
 * The JSX runtime is set explicitly because the app's tsconfig says
 * `preserve` for Next's compiler, which leaves the transformer nothing to do
 * and the parser a syntax error on the first tag.
 */
export default defineConfig({
  /* rolldown-vite reads its JSX setting here rather than from esbuild. */
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
