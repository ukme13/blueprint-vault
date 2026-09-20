import { describe, expect, it } from "vitest";
import { ARTICLE_COPY } from "./article-copy";
import {
  LANDING_HERO_TITLE,
  LANDING_STYLE_GROUPS,
  PREVIEW_LANDING_IDS,
  landingCardSlots,
  landingIdsFor,
} from "./landing-copy";
import {
  applyColorToStyleGroup,
  applyRoleToBlocks,
  applyStyleToGroup,
  attachGroupColor,
  blockElementForRole,
  detachSlotColor,
  mergeBlockWithPrevious,
  PREVIEW_FOOTER_BASE_IDS,
  PREVIEW_NAV_LINK_IDS,
  PREVIEW_SHELL_IDS,
  idsSharingStyle,
  previewInspectorChrome,
  readPreviewDocument,
  readPreviewLanding,
  readPreviewShell,
  removeBlock,
  resolveDocumentRole,
  roleForInsertedBlock,
  seedPreviewDocument,
  seedPreviewLanding,
  seedPreviewShell,
  selectedDocumentBlocks,
  splitBlock,
  updateBlockText,
} from "./preview-document";
import { defaultSystem } from "./system";

const system = () => defaultSystem("Scale", ["Inter"], 16, 1.25, 9);

describe("preview document", () => {
  it("seeds the article title as h1, not as the specimen pangram", () => {
    const document = seedPreviewDocument(system());
    const title = document.find((block) => block.id === "preview-title");
    expect(title?.text).toBe(ARTICLE_COPY.en.title);
    expect(title?.roleId).toBe("h1");
    expect(document.some((block) => block.text.includes("vexingly"))).toBe(
      false,
    );
  });

  it("applies a role to the selected blocks and leaves the others", () => {
    const before = seedPreviewDocument(system());
    const after = applyRoleToBlocks(before, ["preview-body-one"], "h2");
    expect(after.find((block) => block.id === "preview-body-one")?.roleId).toBe(
      "h2",
    );
    expect(after.find((block) => block.id === "preview-body-two")?.roleId).toBe(
      "body",
    );
    expect(after.find((block) => block.id === "preview-body-one")?.text).toBe(
      before.find((block) => block.id === "preview-body-one")?.text,
    );
  });

  it("fills a missing or empty stored document from the seed", () => {
    const seeded = seedPreviewDocument(system());
    expect(readPreviewDocument(undefined, system())).toEqual(seeded);
    expect(readPreviewDocument([], system())).toEqual(seeded);
    expect(readPreviewDocument("nope", system())).toEqual(seeded);
  });

  it("keeps a saved document rather than reseeding it", () => {
    const stored = [
      { id: "mine", roleId: "body", text: "Hello from the workspace" },
    ];
    expect(readPreviewDocument(stored, system())).toEqual(stored);
  });

  it("drops malformed blocks and reseeds if none remain", () => {
    expect(
      readPreviewDocument([{ id: "", roleId: "body", text: "x" }], system()),
    ).toEqual(seedPreviewDocument(system()));
    expect(
      readPreviewDocument(
        [
          { id: "ok", roleId: "body", text: "Kept" },
          { id: 1, roleId: "body", text: "nope" },
        ],
        system(),
      ),
    ).toEqual([{ id: "ok", roleId: "body", text: "Kept" }]);
  });

  it("renders a deleted role as body rather than unstyled", () => {
    const role = resolveDocumentRole(system(), "does-not-exist");
    expect(role?.id).toBe("body");
  });

  it("uses a paragraph tag for label and caption blocks", () => {
    const current = system();
    const label = current.roles.find((role) => role.id === "label")!;
    const caption = current.roles.find((role) => role.id === "caption")!;
    const heading = current.roles.find((role) => role.id === "h2")!;
    expect(blockElementForRole(current, label)).toBe("p");
    expect(blockElementForRole(current, caption)).toBe("p");
    expect(blockElementForRole(current, heading)).toBe("h2");
  });

  it("starts a body block after a heading, and stays in body after body", () => {
    expect(roleForInsertedBlock(system(), "h1")).toBe("body");
    expect(roleForInsertedBlock(system(), "body")).toBe("body");
    expect(roleForInsertedBlock(system(), "label")).toBe("label");
  });

  it("splits a block at the caret without touching the scale", () => {
    const document = [{ id: "a", roleId: "body", text: "Hello world" }];
    const next = splitBlock(document, "a", 6, "b", "body");
    expect(next).toEqual([
      { id: "a", roleId: "body", text: "Hello " },
      { id: "b", roleId: "body", text: "world" },
    ]);
  });

  it("will not delete the last block", () => {
    const document = [{ id: "only", roleId: "body", text: "Hi" }];
    expect(removeBlock(document, "only")).toEqual([
      { id: "only", roleId: "body", text: "" },
    ]);
  });

  it("merges into the previous block on backspace at the start", () => {
    const document = [
      { id: "a", roleId: "h1", text: "Hello" },
      { id: "b", roleId: "body", text: " world" },
    ];
    expect(mergeBlockWithPrevious(document, "b")).toEqual([
      { id: "a", roleId: "h1", text: "Hello world" },
    ]);
  });

  it("updates text in place", () => {
    const document = [{ id: "a", roleId: "body", text: "old" }];
    expect(updateBlockText(document, "a", "new")).toEqual([
      { id: "a", roleId: "body", text: "new" },
    ]);
  });

  it("drops stale selected ids and reports each remaining role once", () => {
    const document = [
      { id: "a", roleId: "h1", text: "Hello" },
      { id: "b", roleId: "body", text: "World" },
      { id: "c", roleId: "body", text: "Again" },
    ];
    expect(selectedDocumentBlocks(document, ["gone", "b", "c", "a"])).toEqual({
      ids: ["b", "c", "a"],
      roleIds: ["body", "h1"],
    });
    expect(selectedDocumentBlocks(document, [])).toEqual({
      ids: [],
      roleIds: [],
    });
  });
});

describe("preview shell", () => {
  it("seeds the frozen chrome slots and no others", () => {
    const shell = seedPreviewShell(system());
    expect(shell.map((block) => block.id)).toEqual([...PREVIEW_SHELL_IDS]);
    expect(shell).toHaveLength(PREVIEW_SHELL_IDS.length);
    expect(shell.find((block) => block.id === "shell-foot-copy")).toMatchObject(
      {
        roleId: "caption",
        text: "© 2026 Blueprint. Placeholder content for typography preview.",
      },
    );
    expect(
      shell.find((block) => block.id === "shell-foot-credit"),
    ).toMatchObject({
      roleId: "caption",
      text: "Made for type testing",
    });
  });

  it("fills a missing or empty store from the seed", () => {
    const seeded = seedPreviewShell(system());
    expect(readPreviewShell(undefined, system())).toEqual(seeded);
    expect(readPreviewShell([], system())).toEqual(seeded);
    expect(readPreviewShell("nope", system())).toEqual(seeded);
  });

  it("keeps stored text and role on a known id, and ignores unknown ids", () => {
    const after = readPreviewShell(
      [
        { id: "shell-brand", roleId: "h1", text: "Studio" },
        { id: "shell-extra", roleId: "body", text: "should not survive" },
        { id: "shell-nav-1", roleId: "caption", text: "Work" },
      ],
      system(),
    );
    expect(after).toHaveLength(PREVIEW_SHELL_IDS.length);
    expect(after.find((block) => block.id === "shell-brand")).toEqual({
      id: "shell-brand",
      roleId: "h1",
      text: "Studio",
    });
    expect(after.find((block) => block.id === "shell-nav-1")?.text).toBe(
      "Work",
    );
    expect(after.some((block) => block.id === "shell-extra")).toBe(false);
    expect(after.map((block) => block.id)).toEqual([...PREVIEW_SHELL_IDS]);
  });

  it("renames retired seed brand copy to Blueprint", () => {
    const after = readPreviewShell(
      [
        { id: "shell-brand", roleId: "label", text: "M" },
        {
          id: "shell-foot-copy",
          roleId: "caption",
          text: "© 2026 Veltra. Placeholder content for typography preview.",
        },
      ],
      system(),
    );
    expect(after.find((block) => block.id === "shell-brand")?.text).toBe(
      "Blueprint",
    );
    expect(after.find((block) => block.id === "shell-foot-copy")?.text).toBe(
      "© 2026 Blueprint. Placeholder content for typography preview.",
    );
  });

  it("renames retired footer blurb to Blueprint studio copy", () => {
    const after = readPreviewShell(
      [
        {
          id: "shell-footer",
          roleId: "caption",
          text: "Business software for teams that would rather work than configure.",
        },
      ],
      system(),
    );
    expect(after.find((block) => block.id === "shell-footer")?.text).toBe(
      "A studio for palettes, type and layout — then a page that proves them.",
    );
  });

  it("does not grow when text or role is patched", () => {
    const before = seedPreviewShell(system());
    const renamed = updateBlockText(before, "shell-brand", "Acme");
    const restyled = applyRoleToBlocks(renamed, ["shell-action"], "h1");
    expect(restyled).toHaveLength(PREVIEW_SHELL_IDS.length);
    expect(restyled.find((block) => block.id === "shell-brand")?.text).toBe(
      "Acme",
    );
    expect(restyled.find((block) => block.id === "shell-action")?.roleId).toBe(
      "h1",
    );
    expect(readPreviewShell(restyled, system())).toHaveLength(
      PREVIEW_SHELL_IDS.length,
    );
  });
});

describe("preview style groups", () => {
  it("lists nav links together, including Login, and not Brand", () => {
    expect(idsSharingStyle("shell-nav-1")).toEqual([...PREVIEW_NAV_LINK_IDS]);
    expect(idsSharingStyle("shell-login")).toEqual([...PREVIEW_NAV_LINK_IDS]);
    expect(idsSharingStyle("shell-brand")).toEqual(["shell-brand"]);
    expect(idsSharingStyle("shell-foot-copy")).toEqual([
      ...PREVIEW_FOOTER_BASE_IDS,
    ]);
    expect(idsSharingStyle("shell-foot-credit")).toEqual([
      ...PREVIEW_FOOTER_BASE_IDS,
    ]);
  });

  it("applies one role to every nav link and leaves the CTA", () => {
    const before = seedPreviewShell(system());
    const after = applyRoleToBlocks(
      before,
      idsSharingStyle("shell-nav-1"),
      "h1",
    );
    expect(after.find((block) => block.id === "shell-login")?.roleId).toBe(
      "h1",
    );
    expect(after.find((block) => block.id === "shell-nav-3")?.roleId).toBe(
      "h1",
    );
    expect(after.find((block) => block.id === "shell-action")?.roleId).not.toBe(
      "h1",
    );
  });

  it("preserves individual stored nav roles on read and fills missing from seed", () => {
    const after = readPreviewShell(
      [
        { id: "shell-nav-1", roleId: "h1", text: "Home" },
        { id: "shell-nav-2", roleId: "caption", text: "Features" },
      ],
      system(),
    );
    expect(after.find((block) => block.id === "shell-nav-1")?.roleId).toBe(
      "h1",
    );
    expect(after.find((block) => block.id === "shell-nav-2")?.roleId).toBe(
      "caption",
    );
    expect(after.find((block) => block.id === "shell-login")?.roleId).toBe(
      "caption",
    );
  });

  it("names the inspector from the group, not Inspect", () => {
    expect(previewInspectorChrome("shell-nav-1")).toEqual({
      title: "Nav links",
      subtitle: "Home",
    });
    expect(previewInspectorChrome("shell-foot-product-features")).toEqual({
      title: "Footer links",
      subtitle: "Features",
    });
    expect(previewInspectorChrome("shell-foot-copy")).toEqual({
      title: "Footer baseline",
      subtitle: "Copyright",
    });
    expect(previewInspectorChrome("shell-brand")).toEqual({
      title: "Inspect",
      subtitle: "Brand",
    });
  });

  it("groups by repeated component part, not by seed slot", () => {
    expect(idsSharingStyle("landing-feat-1-title")).toEqual(
      landingIdsFor("feature-card", "title"),
    );
    expect(idsSharingStyle("landing-feat-1-body")).toEqual(
      landingIdsFor("feature-card", "body"),
    );
    expect(idsSharingStyle("landing-quad-1-title")).toEqual(
      landingIdsFor("quad-card", "title"),
    );
    expect(idsSharingStyle("landing-split-a-title")).toEqual(
      landingIdsFor("split", "title"),
    );
    expect(idsSharingStyle("landing-features-title")).toEqual(
      landingIdsFor("section-head", "title"),
    );
    expect(idsSharingStyle("landing-plan-1-f1")).toEqual(
      landingIdsFor("plan", "feature"),
    );
    expect(idsSharingStyle("landing-hero-title")).toEqual([
      "landing-hero-title",
    ]);
    expect(idsSharingStyle("landing-cta-title")).toEqual(["landing-cta-title"]);
    expect(idsSharingStyle("landing-feat-1-title")).not.toContain(
      "landing-split-a-title",
    );
    expect(idsSharingStyle("landing-feat-1-body")).not.toContain(
      "landing-plan-1-f1",
    );
    expect(idsSharingStyle("landing-features-title")).not.toContain(
      "landing-feat-1-title",
    );
  });

  it("maps every tagged landing part into a group of two or more", () => {
    for (const group of LANDING_STYLE_GROUPS) {
      expect(group.ids.length).toBeGreaterThan(1);
    }
  });

  it("pairs each card title with its body in seed order", () => {
    expect(landingCardSlots("feature-card")).toEqual([
      { titleId: "landing-feat-1-title", bodyId: "landing-feat-1-body" },
      { titleId: "landing-feat-2-title", bodyId: "landing-feat-2-body" },
      { titleId: "landing-feat-3-title", bodyId: "landing-feat-3-body" },
    ]);
    expect(landingCardSlots("quad-card")).toHaveLength(4);
    expect(landingCardSlots("quad-card")[0]).toEqual({
      titleId: "landing-quad-1-title",
      bodyId: "landing-quad-1-body",
    });
  });

  it("applies one role to every feature card title and leaves the split", () => {
    const before = seedPreviewLanding(system());
    const after = applyRoleToBlocks(
      before,
      idsSharingStyle("landing-feat-1-title"),
      "h1",
    );
    expect(
      after.find((block) => block.id === "landing-feat-2-title")?.roleId,
    ).toBe("h1");
    expect(
      after.find((block) => block.id === "landing-feat-3-title")?.roleId,
    ).toBe("h1");
    expect(
      after.find((block) => block.id === "landing-split-a-title")?.roleId,
    ).not.toBe("h1");
    expect(
      after.find((block) => block.id === "landing-features-title")?.roleId,
    ).not.toBe("h1");
  });

  it("preserves individual stored feature-card roles on landing read and fills missing from seed", () => {
    const after = readPreviewLanding(
      [
        { id: "landing-feat-1-title", roleId: "h1", text: "Shared drafts" },
        {
          id: "landing-feat-2-title",
          roleId: "caption",
          text: "Type that travels",
        },
        {
          id: "landing-split-a-title",
          roleId: "caption",
          text: "Customisation",
        },
      ],
      system(),
    );
    expect(
      after.find((block) => block.id === "landing-feat-1-title")?.roleId,
    ).toBe("h1");
    expect(
      after.find((block) => block.id === "landing-feat-2-title")?.roleId,
    ).toBe("caption");
    expect(
      after.find((block) => block.id === "landing-feat-3-title")?.roleId,
    ).toBe("h6");
    expect(
      after.find((block) => block.id === "landing-split-a-title")?.roleId,
    ).toBe("caption");
  });

  it("names the landing inspector from the component group", () => {
    expect(previewInspectorChrome("landing-feat-1-title")).toEqual({
      title: "Feature card titles",
      subtitle: "Shared palettes",
    });
    expect(previewInspectorChrome("landing-feat-1-body")).toEqual({
      title: "Feature card bodies",
      subtitle: "Shared palettes",
    });
    expect(previewInspectorChrome("landing-features-title")).toEqual({
      title: "Section titles",
      subtitle: "The system, not the dump",
    });
    expect(previewInspectorChrome("landing-hero-title")).toEqual({
      title: "Inspect",
      subtitle: LANDING_HERO_TITLE,
    });
  });
});

describe("preview landing", () => {
  it("seeds the frozen slots and the hero as h2", () => {
    const landing = seedPreviewLanding(system());
    expect(landing.map((block) => block.id)).toEqual(PREVIEW_LANDING_IDS);
    expect(landing).toHaveLength(PREVIEW_LANDING_IDS.length);
    expect(
      landing.find((block) => block.id === "landing-hero-title"),
    ).toMatchObject({
      text: LANDING_HERO_TITLE,
      roleId: "h2",
    });
  });

  it("keeps stored text and role on a known id, and ignores unknown ids", () => {
    const after = readPreviewLanding(
      [
        { id: "landing-hero-title", roleId: "caption", text: "Hello" },
        { id: "landing-extra", roleId: "body", text: "should not survive" },
      ],
      system(),
    );
    expect(after).toHaveLength(PREVIEW_LANDING_IDS.length);
    expect(after.find((block) => block.id === "landing-hero-title")).toEqual({
      id: "landing-hero-title",
      roleId: "caption",
      text: "Hello",
    });
    expect(after.some((block) => block.id === "landing-extra")).toBe(false);
    expect(after.map((block) => block.id)).toEqual(PREVIEW_LANDING_IDS);
  });

  it("renames retired Veltra landing copy to Blueprint", () => {
    const after = readPreviewLanding(
      [
        {
          id: "landing-hero-title",
          roleId: "h1",
          text: "Your digital transformation begins here",
        },
        {
          id: "landing-hero-eyebrow",
          roleId: "label",
          text: "Business software",
        },
        {
          id: "landing-quad-title",
          roleId: "heading",
          text: "Discover what sets Veltra apart",
        },
      ],
      system(),
    );
    expect(after.find((block) => block.id === "landing-hero-title")?.text).toBe(
      LANDING_HERO_TITLE,
    );
    expect(
      after.find((block) => block.id === "landing-hero-eyebrow")?.text,
    ).toBe("Design system studio");
    expect(after.find((block) => block.id === "landing-quad-title")?.text).toBe(
      "What the system actually holds",
    );
  });

  it("does not grow when text or role is patched", () => {
    const before = seedPreviewLanding(system());
    const renamed = updateBlockText(before, "landing-hero-title", "Acme");
    const restyled = applyRoleToBlocks(renamed, ["landing-hero-lead"], "h2");
    expect(restyled).toHaveLength(PREVIEW_LANDING_IDS.length);
    expect(
      restyled.find((block) => block.id === "landing-hero-title")?.text,
    ).toBe("Acme");
    expect(
      restyled.find((block) => block.id === "landing-hero-lead")?.roleId,
    ).toBe("h2");
    expect(readPreviewLanding(restyled, system())).toHaveLength(
      PREVIEW_LANDING_IDS.length,
    );
  });
});

describe("preview text colour", () => {
  it("writes a token onto grouped slots that still follow the group", () => {
    const before = seedPreviewLanding(system());
    const after = applyColorToStyleGroup(
      before,
      "landing-feat-1-title",
      "fg.accent",
    );
    expect(
      after.find((block) => block.id === "landing-feat-1-title")?.colorTokenId,
    ).toBe("fg.accent");
    expect(
      after.find((block) => block.id === "landing-feat-2-title")?.colorTokenId,
    ).toBe("fg.accent");
    expect(
      after.find((block) => block.id === "landing-feat-3-title")?.colorTokenId,
    ).toBe("fg.accent");
    expect(
      after.find((block) => block.id === "landing-split-a-title")?.colorTokenId,
    ).toBeUndefined();
  });

  it("leaves siblings when a slot is detached, then snaps them on reattach", () => {
    const grouped = applyColorToStyleGroup(
      seedPreviewLanding(system()),
      "landing-feat-1-title",
      "fg.secondary",
    );
    const detached = detachSlotColor(grouped, "landing-feat-2-title");
    const onlyTwo = applyColorToStyleGroup(
      detached,
      "landing-feat-2-title",
      "fg.accent",
    );
    expect(
      onlyTwo.find((block) => block.id === "landing-feat-2-title"),
    ).toMatchObject({
      colorTokenId: "fg.accent",
      colorDetached: true,
    });
    expect(
      onlyTwo.find((block) => block.id === "landing-feat-1-title")
        ?.colorTokenId,
    ).toBe("fg.secondary");
    expect(
      onlyTwo.find((block) => block.id === "landing-feat-3-title")
        ?.colorTokenId,
    ).toBe("fg.secondary");

    const joined = attachGroupColor(onlyTwo, "landing-feat-2-title");
    expect(
      joined.find((block) => block.id === "landing-feat-1-title"),
    ).toMatchObject({ colorTokenId: "fg.accent" });
    expect(
      joined.find((block) => block.id === "landing-feat-3-title"),
    ).toMatchObject({ colorTokenId: "fg.accent" });
    expect(
      joined.find((block) => block.id === "landing-feat-2-title")
        ?.colorDetached,
    ).toBeUndefined();
  });

  it("preserves stored colours on landing read", () => {
    const after = readPreviewLanding(
      [
        {
          id: "landing-feat-1-title",
          roleId: "heading",
          text: "Shared palettes",
          colorTokenId: "fg.accent",
        },
        {
          id: "landing-feat-2-title",
          roleId: "heading",
          text: "Type that travels",
          colorTokenId: "fg.secondary",
        },
        {
          id: "landing-feat-3-title",
          roleId: "heading",
          text: "Handover that matches",
          colorTokenId: "fg.primary",
        },
      ],
      system(),
    );
    expect(
      after.find((block) => block.id === "landing-feat-1-title")?.colorTokenId,
    ).toBe("fg.accent");
    expect(
      after.find((block) => block.id === "landing-feat-2-title")?.colorTokenId,
    ).toBe("fg.secondary");
    expect(
      after.find((block) => block.id === "landing-feat-3-title")?.colorTokenId,
    ).toBe("fg.primary");
  });

  it("applies a slot's role and colour to all members in its style group", () => {
    const before = seedPreviewLanding(system());
    const one = before.map((block) =>
      block.id === "landing-feat-1-title"
        ? { ...block, roleId: "h1", colorTokenId: "fg.accent" }
        : block,
    );
    const after = applyStyleToGroup(one, "landing-feat-1-title");
    expect(after.find((b) => b.id === "landing-feat-1-title")).toMatchObject({
      roleId: "h1",
      colorTokenId: "fg.accent",
    });
    expect(after.find((b) => b.id === "landing-feat-2-title")?.roleId).toBe(
      "h1",
    );
    expect(after.find((b) => b.id === "landing-feat-3-title")).toMatchObject({
      roleId: "h1",
      colorTokenId: "fg.accent",
    });
    expect(
      after.find((b) => b.id === "landing-split-a-title")?.roleId,
    ).not.toBe("h1");
  });
});
