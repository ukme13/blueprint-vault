import { describe, expect, it } from "vitest";
import {
  clientRoutePaths,
  docsRouteGroups,
  docsRoutesFor,
  DOCS_ROUTES,
  type DocsRoute,
} from "./docs-routes";
import { HANDOVER_ROUTES, isHandoverPagePath } from "./handover";

/*
 * The list the nav, the home page, the archive copy and the archive guard all
 * read.
 *
 * What is being protected is an agreement between four readers rather than a
 * function's output. So the tests that matter are the ones that would catch
 * two of them disagreeing — a page in the nav that is not in the archive, a
 * page in the archive that no audience admits to.
 */

/* Fixtures rather than the real list for the audience tests, because the real
   list has nothing internal in it yet — the studio routes arrive with the
   studio pages. A test that read the real list today would pass by describing
   an empty set and stop meaning anything the moment it filled. */
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

function groupsOf(routes: DocsRoute[], audience: "client" | "internal") {
  const visible =
    audience === "internal"
      ? routes
      : routes.filter((route) => route.audience === "client");
  const names = new Set(visible.map((route) => route.group));
  return [...names];
}

describe("who sees which routes", () => {
  it("shows an internal reader everything", () => {
    expect(docsRoutesFor("internal")).toHaveLength(DOCS_ROUTES.length);
  });

  it("shows a client only what is marked for one", () => {
    /* `client` is the narrower audience, not one of two: everything a client
       receives is on the internal site too. */
    for (const route of docsRoutesFor("client")) {
      expect(route.audience).toBe("client");
    }
  });

  it("keeps the Studio group out of a client's nav entirely", () => {
    /* Not rendered empty — absent. A heading with nothing under it tells a
       client there is something here they cannot see, which is the same leak
       with better manners. */
    expect(groupsOf(FIXTURE, "internal")).toContain("Studio");
    expect(groupsOf(FIXTURE, "client")).not.toContain("Studio");
  });

  it("drops an empty group rather than rendering its heading", () => {
    /* Against the real list, which has no Studio routes yet. The group must
       already be absent, or the client build is not the thing being tested. */
    const client = docsRouteGroups("client").map((entry) => entry.group);
    expect(client).not.toContain("Studio");
    for (const entry of docsRouteGroups("internal")) {
      expect(entry.routes.length).toBeGreaterThan(0);
    }
  });

  it("keeps the reading order the list is written in", () => {
    /* Colour first because the others refer to it. A group that sorted its
       own rows would put Elevation before Semantic roles. */
    const foundations = docsRouteGroups("internal").find(
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

describe("the list the nav reads and the list the archive reads", () => {
  it("are the same list", () => {
    expect([...HANDOVER_ROUTES]).toEqual(clientRoutePaths());
  });

  it("lets every client route through the archive guard", () => {
    /* The pairing that matters: a page in a client's nav that the copy holds
       back is a link to a folder that is not there. */
    for (const route of docsRoutesFor("client")) {
      expect(isHandoverPagePath(`${route.path}/index.html`), route.path).toBe(
        true,
      );
    }
  });

  it("holds back a path no route claims", () => {
    expect(isHandoverPagePath("studio/index.html")).toBe(false);
    expect(isHandoverPagePath("foundations/invented/index.html")).toBe(false);
  });

  it("gives every route a unique path", () => {
    const paths = DOCS_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("writes no leading or trailing slash on a path", () => {
    /* Both readers join this onto something. A leading slash makes the guard's
       segment comparison miss and the copy look for a file at the drive root. */
    for (const route of DOCS_ROUTES) {
      expect(route.path.startsWith("/"), route.path).toBe(false);
      expect(route.path.endsWith("/"), route.path).toBe(false);
    }
  });
});
