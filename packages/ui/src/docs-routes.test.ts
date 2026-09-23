import { describe, expect, it } from "vitest";
import * as barrel from "./index";
import {
  docsRouteGroups,
  docsRoutesFor,
  DOCS_ROUTES,
  INTERNAL_DOCS_ROUTES,
} from "./docs-routes";
import { CLIENT_DOCS_ROUTES } from "./system/docs-routes";

/*
 * The whole route list, and the wall between its halves.
 *
 * The wall is the interesting part. Every client component in `apps/docs`
 * imports `@blueprint/ui`, so a row re-exported from the barrel can reach a
 * browser bundle whether or not a browser asks for it — measured, not assumed:
 * with the list in the barrel, a throwaway internal route's label came back
 * out of a shared chunk of a client handover while every page of it had been
 * correctly held back.
 *
 * A test cannot watch a bundler. What it can do is hold the barrel's shape, so
 * that undoing the split takes a deliberate edit to a file that says why.
 */

describe("the two halves", () => {
  it("make up the whole list between them", () => {
    expect(DOCS_ROUTES).toHaveLength(
      CLIENT_DOCS_ROUTES.length + INTERNAL_DOCS_ROUTES.length,
    );
    expect(DOCS_ROUTES.slice(0, CLIENT_DOCS_ROUTES.length)).toEqual(
      CLIENT_DOCS_ROUTES,
    );
  });

  it("shows an internal reader both, and a client only one", () => {
    expect(docsRoutesFor("internal")).toHaveLength(DOCS_ROUTES.length);
    expect(docsRoutesFor("client")).toEqual([...CLIENT_DOCS_ROUTES]);
  });

  it("marks every internal row as internal", () => {
    for (const route of INTERNAL_DOCS_ROUTES) {
      expect(route.audience, route.path).toBe("internal");
    }
  });

  it("gives an internal reader a Studio section and a client none", () => {
    expect(docsRouteGroups("internal").map((entry) => entry.group)).toContain(
      "Studio",
    );
    expect(docsRouteGroups("client").map((entry) => entry.group)).not.toContain(
      "Studio",
    );
  });
});

describe("the package barrel", () => {
  it("does not re-export the audience-aware list", () => {
    /* If these appear on the barrel the split has been undone, and the only
       symptom will be route metadata in somebody's JavaScript months later. */
    for (const name of [
      "DOCS_ROUTES",
      "INTERNAL_DOCS_ROUTES",
      "docsRoutesFor",
      "docsRouteGroups",
    ]) {
      expect(Object.keys(barrel), name).not.toContain(name);
    }
  });

  it("still re-exports what a client build needs", () => {
    /* The other half of the rule. The archive guard derives its allowlist from
       these, and the nav renders them, so hiding them would break the thing
       the split exists to protect. */
    for (const name of [
      "CLIENT_DOCS_ROUTES",
      "clientRoutePaths",
      "groupDocsRoutes",
      "HANDOVER_ROUTES",
    ]) {
      expect(Object.keys(barrel), name).toContain(name);
    }
  });

  it("names no internal route anywhere in its exported values", () => {
    /* Reads what the barrel actually holds rather than what it declares: a row
       reachable through some other export would not show up as a key.

       On the path as a serialised value — `:"studio"` — rather than as a bare
       substring, and not on the label at all. Two false positives taught the
       shape: the label "Typography" is also a client route's, and the word
       "studio" appears in this package's own prose about the studio's preview
       template. What is being looked for is a row, and a row serialises its
       path as a whole value. */
    const text = JSON.stringify(
      Object.fromEntries(
        Object.entries(barrel).filter(
          ([, value]) => typeof value !== "function",
        ),
      ),
    );
    for (const route of INTERNAL_DOCS_ROUTES) {
      expect(text, route.path).not.toContain(`:"${route.path}"`);
      expect(text, route.path).not.toContain(route.description);
    }
  });
});
