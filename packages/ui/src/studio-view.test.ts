import { describe, expect, it } from "vitest";
import {
  rememberStudioView,
  studioHref,
  studioViewParam,
  withStudioParam,
  withoutStudioParams,
} from "./studio-view";

const VIEWS = ["editor", "specimen", "preview"] as const;

describe("studioViewParam", () => {
  it("takes a view the studio has", () => {
    expect(studioViewParam("specimen", VIEWS, "editor")).toBe("specimen");
    expect(studioViewParam("editor", VIEWS, "editor")).toBe("editor");
  });

  it("falls back for a missing, stale or hand-edited value", () => {
    expect(studioViewParam(null, VIEWS, "editor")).toBe("editor");
    expect(studioViewParam("", VIEWS, "editor")).toBe("editor");
    expect(studioViewParam("uses", VIEWS, "editor")).toBe("editor");
    /* Case matters: the value is an id, not a label. */
    expect(studioViewParam("Specimen", VIEWS, "editor")).toBe("editor");
  });
});

describe("withStudioParam", () => {
  it("sets a parameter and keeps the others", () => {
    expect(withStudioParam("", "view", "specimen", "editor")).toBe(
      "view=specimen",
    );
    expect(withStudioParam("?tab=groups", "view", "preview", "editor")).toBe(
      "tab=groups&view=preview",
    );
    expect(withStudioParam("view=preview", "view", "specimen", "editor")).toBe(
      "view=specimen",
    );
  });

  it("drops a parameter set back to its default", () => {
    expect(withStudioParam("view=specimen", "view", "editor", "editor")).toBe(
      "",
    );
    /* The other parameter stays. */
    expect(
      withStudioParam("view=specimen&tab=groups", "view", "editor", "editor"),
    ).toBe("tab=groups");
  });
});

describe("withoutStudioParams", () => {
  it("drops the named parameters and keeps the others", () => {
    expect(
      withoutStudioParams("?view=semantics&group=border&tab=a", ["group"]),
    ).toBe("view=semantics&tab=a");
    expect(withoutStudioParams("group=border&x=1", ["group", "x"])).toBe("");
  });

  it("leaves a query without them as it is", () => {
    expect(withoutStudioParams("view=semantics", ["group"])).toBe(
      "view=semantics",
    );
    expect(withoutStudioParams("", ["group"])).toBe("");
  });
});

describe("rememberStudioView", () => {
  it("remembers a departure from the defaults, per studio", () => {
    const one = rememberStudioView({}, "/typography", "?view=specimen");
    const two = rememberStudioView(one, "/spacing", "view=uses");
    expect(two).toEqual({
      "/typography": "view=specimen",
      "/spacing": "view=uses",
    });
  });

  it("forgets a studio that is back on its defaults", () => {
    const memory = { "/typography": "view=specimen", "/spacing": "view=uses" };
    expect(rememberStudioView(memory, "/typography", "")).toEqual({
      "/spacing": "view=uses",
    });
    expect(rememberStudioView(memory, "/typography", "?")).toEqual({
      "/spacing": "view=uses",
    });
  });

  it("returns the same object when nothing changes", () => {
    const memory = { "/typography": "view=specimen" };
    expect(rememberStudioView(memory, "/typography", "view=specimen")).toBe(
      memory,
    );
    expect(rememberStudioView(memory, "/spacing", "")).toBe(memory);
  });

  it("does not change the memory it was given", () => {
    const memory = { "/typography": "view=specimen" };
    rememberStudioView(memory, "/typography", "view=preview");
    expect(memory).toEqual({ "/typography": "view=specimen" });
  });
});

describe("studioHref", () => {
  it("is the path, plus the query the studio was left on", () => {
    const memory = { "/typography": "view=specimen&tab=groups" };
    expect(studioHref(memory, "/typography")).toBe(
      "/typography?view=specimen&tab=groups",
    );
    expect(studioHref(memory, "/spacing")).toBe("/spacing");
    expect(studioHref({}, "/typography")).toBe("/typography");
  });
});
