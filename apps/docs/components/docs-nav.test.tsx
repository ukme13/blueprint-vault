import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  docsRouteGroups,
  type DocsRouteGroup,
} from "@blueprint/ui/docs-routes";
import { DocsNav } from "./DocsNav";
import { SiteFooter } from "./SiteFooter";
import { docsAudience } from "../lib/audience";

/* A list with an internal route in it, which the real one will not have until
   the studio pages exist. Without this the client assertions below would pass
   by describing an empty set, and would go on passing after the day they stop
   being true. */
const WITH_STUDIO: DocsRouteGroup[] = [
  {
    group: "Foundations",
    routes: [
      {
        path: "foundations/colour",
        label: "Colour",
        description: "…",
        group: "Foundations",
        audience: "client",
      },
    ],
  },
  {
    group: "Studio",
    routes: [
      {
        path: "studio",
        label: "Getting started",
        description: "…",
        group: "Studio",
        audience: "internal",
      },
    ],
  },
];

/*
 * What each audience is shown.
 *
 * The sidebar and the documentation home page are the two places a route name
 * can reach a reader without a page existing behind it, and both of them are
 * rendered into the archive — the home page's text travels in `index.txt` at
 * the archive root whatever the route allowlist says. So "the client build
 * omits the studio section" is a rendering claim, not a file-copying one, and
 * it is checked here.
 *
 * See docs/roadmap/studio-guide.md.
 */

const ORIGINAL = process.env.BLUEPRINT_AUDIENCE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.BLUEPRINT_AUDIENCE;
  else process.env.BLUEPRINT_AUDIENCE = ORIGINAL;
});

describe("the sidebar", () => {
  it("lists every foundation and component a client receives", () => {
    const markup = renderToStaticMarkup(
      <DocsNav
        currentPath="foundations/colour"
        groups={docsRouteGroups("client")}
      />,
    );

    for (const label of [
      "Colour",
      "Semantic roles",
      "Typography",
      "Spacing",
      "Radius",
      "Elevation",
      "Button",
    ]) {
      expect(markup, label).toContain(label);
    }
    expect(markup).toContain("/foundations/semantic");
  });

  it("names no Studio section for a client", () => {
    /* Absent, not empty. A heading with nothing under it tells a client there
       is something here they are not being shown. */
    const markup = renderToStaticMarkup(
      <DocsNav currentPath="" groups={docsRouteGroups("client")} />,
    );

    expect(markup).not.toContain("Studio");
    expect(markup).not.toContain("studio");
  });

  it("marks the page being read", () => {
    /* Through isSelected, which Astryx turns into aria-current="page" — so
       the current destination is announced rather than carried by colour. */
    const markup = renderToStaticMarkup(
      <DocsNav
        currentPath="foundations/radius"
        groups={docsRouteGroups("internal")}
      />,
    );

    expect(markup).toContain('aria-current="page"');
  });

  it("marks nothing on a page that is not in the list", () => {
    const markup = renderToStaticMarkup(
      <DocsNav currentPath="" groups={docsRouteGroups("internal")} />,
    );

    expect(markup).not.toContain('aria-current="page"');
  });
});

describe("a list that does have an internal route in it", () => {
  it("renders the Studio section when it is handed one", () => {
    const markup = renderToStaticMarkup(
      <DocsNav currentPath="" groups={WITH_STUDIO} />,
    );

    expect(markup).toContain("Studio");
    expect(markup).toContain("Getting started");
    expect(markup).toContain("/studio");
  });

  it("renders nothing of it when it is not", () => {
    /* The pair. The nav shows exactly what the model handed it, so the client
       build hiding the studio guide is the model's decision and not a second
       filter living here that could disagree with the first. */
    const client = WITH_STUDIO.filter((entry) => entry.group !== "Studio");
    const markup = renderToStaticMarkup(
      <DocsNav currentPath="" groups={client} />,
    );

    expect(markup).not.toContain("Studio");
    expect(markup).not.toContain("/studio");
    expect(markup).toContain("Colour");
  });
});

describe("the footer", () => {
  it("links the routes this build's reader may open", () => {
    /* The footer grew links after the reference design was copied, which made
       it a second place a route name can reach a page — and one the archive's
       path guard cannot see, because it reads file names and not their
       contents. It reads the same filtered list the sidebar does, and this is
       the assertion that it keeps doing so. */
    const markup = renderToStaticMarkup(
      <SiteFooter groups={docsRouteGroups("client")} />,
    );

    expect(markup).toContain("/foundations/colour");
    expect(markup).toContain("/docs/button");
  });

  it("names no internal route for a client", () => {
    const markup = renderToStaticMarkup(<SiteFooter groups={WITH_STUDIO} />);
    expect(markup).toContain("/studio");

    const client = WITH_STUDIO.filter((entry) => entry.group !== "Studio");
    const forClient = renderToStaticMarkup(<SiteFooter groups={client} />);
    expect(forClient).not.toContain("/studio");
    expect(forClient).not.toContain("Getting started");
  });
});

describe("which build this is", () => {
  it("is internal when nothing says otherwise", () => {
    /* Local development, and any deployment that has not thought about it. */
    delete process.env.BLUEPRINT_AUDIENCE;
    expect(docsAudience()).toBe("internal");

    process.env.BLUEPRINT_AUDIENCE = "";
    expect(docsAudience()).toBe("internal");
  });

  it("is a client build only when the build says so", () => {
    process.env.BLUEPRINT_AUDIENCE = "client";
    expect(docsAudience()).toBe("client");

    process.env.BLUEPRINT_AUDIENCE = "internal";
    expect(docsAudience()).toBe("internal");
  });

  it("stops the build on a value it does not recognise", () => {
    /* The failure that would otherwise be silent and expensive: a misspelled
       `clientt` falls to the `internal` default, and the studio guide goes
       into a client's archive. Unset is a decision; misspelled is not. */
    process.env.BLUEPRINT_AUDIENCE = "clientt";
    expect(() => docsAudience()).toThrow(/BLUEPRINT_AUDIENCE/);

    process.env.BLUEPRINT_AUDIENCE = "Client";
    expect(() => docsAudience()).toThrow();
  });
});
