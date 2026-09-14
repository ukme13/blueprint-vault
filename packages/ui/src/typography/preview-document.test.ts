import { describe, expect, it } from "vitest";
import { ARTICLE_COPY } from "./article-copy";
import {
  applyRoleToBlocks,
  blockElementForRole,
  mergeBlockWithPrevious,
  readPreviewDocument,
  removeBlock,
  resolveDocumentRole,
  roleForInsertedBlock,
  seedPreviewDocument,
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
