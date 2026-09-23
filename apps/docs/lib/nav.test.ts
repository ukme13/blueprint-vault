import { describe, expect, it } from "vitest";
import { docsRouteGroups } from "@blueprint/ui/docs-routes";
import {
  activeDocsGroup,
  docsSections,
  footerLinks,
  sidebarGroups,
} from "./nav";

/*
 * The sections, against the real route lists for both audiences.
 *
 * The client cases are the load-bearing ones. A client's archive must not
 * name the studio anywhere, and these functions feed the header, the sidebar
 * and the footer of every page in it.
 */

const CLIENT = docsRouteGroups("client");
const INTERNAL = docsRouteGroups("internal");
const STUDIO_URL = "http://localhost:3000";

describe("the header sections", () => {
  it("links each section's first page", () => {
    expect(docsSections(INTERNAL)).toEqual([
      { group: "Foundations", href: "/foundations/colour" },
      { group: "Components", href: "/docs/button" },
      { group: "Studio", href: "/studio" },
    ]);
  });

  it("offers a client no Studio section", () => {
    expect(docsSections(CLIENT).map((section) => section.group)).toEqual([
      "Foundations",
      "Components",
    ]);
  });
});

describe("the active section", () => {
  it("is the group the page is in", () => {
    expect(activeDocsGroup(INTERNAL, "foundations/spacing")).toBe(
      "Foundations",
    );
    expect(activeDocsGroup(INTERNAL, "docs/button")).toBe("Components");
    expect(activeDocsGroup(INTERNAL, "studio/whats-new")).toBe("Studio");
  });

  it("is nothing for a page in no group", () => {
    expect(activeDocsGroup(INTERNAL, "")).toBeUndefined();
    expect(activeDocsGroup(INTERNAL, "not/a/page")).toBeUndefined();
  });
});

describe("the sidebar", () => {
  it("shows only the section being read", () => {
    const groups = sidebarGroups(INTERNAL, "foundations/colour");
    expect(groups.map((entry) => entry.group)).toEqual(["Foundations"]);
    expect(groups[0]!.routes).toHaveLength(6);
  });

  it("shows the studio guide's pages in the Studio section", () => {
    const [studio] = sidebarGroups(INTERNAL, "studio");
    expect(studio!.routes.map((route) => route.label)).toContain(
      "Getting started",
    );
    expect(studio!.routes.map((route) => route.label)).toContain("What's new");
  });

  it("shows every group on a page that is in none", () => {
    expect(sidebarGroups(INTERNAL, "")).toHaveLength(INTERNAL.length);
  });
});

describe("the footer", () => {
  it("gives an internal build its three destinations", () => {
    expect(footerLinks(INTERNAL, STUDIO_URL)).toEqual([
      { label: "Getting started", href: "/studio", isExternal: false },
      { label: "What's new", href: "/studio/whats-new", isExternal: false },
      { label: "Open Studio", href: STUDIO_URL, isExternal: true },
    ]);
  });

  it("gives a client its own sections and nothing of the studio", () => {
    const links = footerLinks(CLIENT, STUDIO_URL);
    expect(links.map((link) => link.href)).toEqual([
      "/foundations/colour",
      "/docs/button",
    ]);
    const text = JSON.stringify(links);
    expect(text).not.toContain("studio");
    expect(text).not.toContain("Studio");
    expect(text).not.toContain(STUDIO_URL);
  });
});
