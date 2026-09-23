import { describe, expect, it } from "vitest";
import { docsUrl } from "./docs-url";

/*
 * The link from the studio to the documentation.
 *
 * Small, and worth checking anyway: the two applications are separate
 * deployments, so this string is the only thing joining them, and the ways it
 * goes wrong — a double slash, a lost path — are invisible in development
 * where the base has no trailing slash and nobody has configured anything.
 */

describe("docsUrl", () => {
  it("joins a base and a path", () => {
    expect(docsUrl("studio", "http://localhost:3001")).toBe(
      "http://localhost:3001/studio",
    );
  });

  it("does not double the slash on a base that ends in one", () => {
    expect(docsUrl("studio", "https://docs.example.com/")).toBe(
      "https://docs.example.com/studio",
    );
    expect(docsUrl("/studio", "https://docs.example.com/")).toBe(
      "https://docs.example.com/studio",
    );
  });

  it("keeps a base that is more than a host", () => {
    /* A documentation site served under a path of its own, which is what a
       single deployment hosting both applications looks like. */
    expect(docsUrl("studio/guides/anchors", "https://example.com/docs")).toBe(
      "https://example.com/docs/studio/guides/anchors",
    );
  });

  it("returns the base itself for an empty path", () => {
    expect(docsUrl("", "https://docs.example.com/")).toBe(
      "https://docs.example.com",
    );
  });
});
