import { describe, expect, it } from "vitest";
import {
  clientRoutePaths,
  groupDocsRoutes,
  CLIENT_DOCS_ROUTES,
  type DocsRoute,
} from "./docs-routes";
import { HANDOVER_ROUTES, isHandoverPagePath } from "./handover";

/*
 * The half of the route list a client receives, and the grouping both halves
 * share.
 *
 * What is being protected is an agreement between readers rather than a
 * function's output. So the tests that matter are the ones that would catch
 * two of them disagreeing — a page in the nav that is not in the archive, a
 * page in the archive that no route claims.
 */

const FIXTURE: DocsRoute[] = [
  {
    path: "foundations/colour",
    label: "Colour",
    description: "…",
    group: "Foundations",
    audience: "client",
  },
  {
    path: "docs/button",
    label: "Button",
    description: "…",
    group: "Components",
    audience: "client",
  },
  {
    path: "studio",
    label: "Getting started",
    description: "…",
    group: "Studio",
    audience: "internal",
  },
];

describe("grouping", () => {
  it("groups any list it is handed, in group order", () => {
    /* It takes rows rather than an audience: the audience-aware list lives in
       the other entry point, and this has to serve a caller holding either
       half. */
    expect(groupDocsRoutes(FIXTURE).map((entry) => entry.group)).toEqual([
      "Foundations",
      "Components",
      "Studio",
    ]);
  });

  it("drops a group with nothing in it rather than heading it", () => {
    /* A client build showing an empty Studio heading tells a client there is
       something here they are not being shown. */
    const client = FIXTURE.filter((route) => route.audience === "client");
    expect(groupDocsRoutes(client).map((entry) => entry.group)).toEqual([
      "Foundations",
      "Components",
    ]);
  });

  it("keeps the reading order the list is written in", () => {
    /* Colour first because the others refer to it. A group that sorted its own
       rows would put Elevation before Semantic roles. */
    const foundations = groupDocsRoutes(CLIENT_DOCS_ROUTES).find(
      (entry) => entry.group === "Foundations",
    )!;
    expect(foundations.routes.map((route) => route.label)).toEqual([
      "Colour",
      "Semantic roles",
      "Typography",
      "Spacing",
      "Radius",
      "Elevation",
    ]);
  });
});

describe("the client half and the archive guard", () => {
  it("are the same list", () => {
    expect([...HANDOVER_ROUTES]).toEqual(clientRoutePaths());
  });

  it("lets every client route through the guard", () => {
    /* The pairing that matters: a page in a client's nav that the copy holds
       back is a link to a folder that is not there. */
    for (const route of CLIENT_DOCS_ROUTES) {
      expect(isHandoverPagePath(`${route.path}/index.html`), route.path).toBe(
        true,
      );
    }
  });

  it("holds back a path no client route claims", () => {
    expect(isHandoverPagePath("studio/index.html")).toBe(false);
    expect(isHandoverPagePath("foundations/invented/index.html")).toBe(false);
  });

  it("carries no internal row", () => {
    /* The whole point of the split. A row marked internal that sat here would
       be reachable from the package barrel, and therefore from the browser
       bundle of any application that imports it. */
    for (const route of CLIENT_DOCS_ROUTES) {
      expect(route.audience, route.path).toBe("client");
    }
  });

  it("gives every route a unique path, with no slashes on the ends", () => {
    /* Both readers join this onto something. A leading slash makes the guard's
       segment comparison miss and the copy look for a file at the drive root. */
    const paths = CLIENT_DOCS_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.startsWith("/"), path).toBe(false);
      expect(path.endsWith("/"), path).toBe(false);
    }
  });
});
