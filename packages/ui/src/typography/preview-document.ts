import { ARTICLE_COPY, type ArticleCopy } from "./article-copy";
import { resolveTemplateSlot } from "./role-rows";
import {
  elementForRole,
  HEADING_GROUP_ID,
  type TypeRole,
  type TypeSystem,
} from "./system";
import type { PreviewLanguage } from "./preview-template-shared";
import type { SemanticRole } from "./types";

/**
 * One block in the preview document.
 *
 * A block is a paragraph or a heading, never a span. Applying a style changes
 * this block's role. The document is judged in Preview;
 * it never writes back into the scale.
 */
export interface PreviewDocumentBlock {
  id: string;
  /** A TypeRole.id. Missing roles fall back at render, not on disk. */
  roleId: string;
  text: string;
}

export type PreviewDocument = PreviewDocumentBlock[];

const SEED_SLOTS: Array<{
  id: string;
  slot: SemanticRole;
  key: keyof ArticleCopy;
}> = [
  { id: "preview-kicker", slot: "label", key: "kicker" },
  { id: "preview-title", slot: "display", key: "title" },
  { id: "preview-standfirst", slot: "title", key: "standfirst" },
  { id: "preview-byline", slot: "caption", key: "byline" },
  { id: "preview-heading-one", slot: "heading", key: "headingOne" },
  { id: "preview-body-one", slot: "body", key: "bodyOne" },
  { id: "preview-quote", slot: "title", key: "quote" },
  { id: "preview-heading-two", slot: "heading", key: "headingTwo" },
  { id: "preview-body-two", slot: "body", key: "bodyTwo" },
  { id: "preview-caption", slot: "caption", key: "caption" },
];

function fallbackRoleId(system: TypeSystem): string {
  return (
    resolveTemplateSlot(system, "body")?.id ?? system.roles[0]?.id ?? "body"
  );
}

/** The role a stored block should draw, even if that id has since been deleted. */
export function resolveDocumentRole(
  system: TypeSystem,
  roleId: string,
): TypeRole | null {
  if (system.roles.length === 0) return null;
  return (
    system.roles.find((role) => role.id === roleId) ??
    resolveTemplateSlot(system, "body") ??
    system.roles[0] ??
    null
  );
}

/**
 * Tag a document block renders as.
 *
 * Label and caption are spans in a form or a figure; here they are blocks, so
 * they become paragraphs. Headings keep the tag `elementForRole` already gave
 * them. Display stays a paragraph: it is a size, not an outline level.
 */
export function blockElementForRole(
  system: TypeSystem,
  role: TypeRole,
): Exclude<ReturnType<typeof elementForRole>, "span"> {
  const element = elementForRole(system, role);
  return element === "span" ? "p" : element;
}

function pageTitleRoleId(system: TypeSystem): string {
  const named = system.roles.find((role) => role.id === "h1");
  if (named) return named.id;
  const heading = system.roles.find(
    (role) => role.groupId === HEADING_GROUP_ID,
  );
  if (heading) return heading.id;
  return resolveTemplateSlot(system, "display")?.id ?? fallbackRoleId(system);
}

function slotRoleId(system: TypeSystem, slot: SemanticRole): string {
  return resolveTemplateSlot(system, slot)?.id ?? fallbackRoleId(system);
}

/** Starter copy for a workspace that has never edited the preview document. */
export function seedPreviewDocument(
  system: TypeSystem,
  lang: PreviewLanguage = "en",
): PreviewDocument {
  const copy = ARTICLE_COPY[lang];
  return SEED_SLOTS.map((entry) => ({
    id: entry.id,
    roleId:
      entry.key === "title"
        ? pageTitleRoleId(system)
        : slotRoleId(system, entry.slot),
    text: copy[entry.key],
  }));
}

function isBlock(value: unknown): value is PreviewDocumentBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as PreviewDocumentBlock;
  return (
    typeof block.id === "string" &&
    block.id.length > 0 &&
    typeof block.roleId === "string" &&
    block.roleId.length > 0 &&
    typeof block.text === "string"
  );
}

/**
 * A stored document, or the seed when the field is missing or empty.
 *
 * Older saves have no document. An empty array is treated the same: there is
 * nothing to edit, so starting from the article copy is the honest default.
 */
export function readPreviewDocument(
  value: unknown,
  system: TypeSystem,
): PreviewDocument {
  if (!Array.isArray(value)) return seedPreviewDocument(system);
  const blocks = value.filter(isBlock);
  return blocks.length > 0 ? blocks : seedPreviewDocument(system);
}

export function createPreviewBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block-${Math.random().toString(36).slice(2, 10)}`;
}

export function applyRoleToBlocks(
  document: PreviewDocument,
  blockIds: readonly string[],
  roleId: string,
): PreviewDocument {
  if (blockIds.length === 0) return document;
  const selected = new Set(blockIds);
  return document.map((block) =>
    selected.has(block.id) ? { ...block, roleId } : block,
  );
}

export function updateBlockText(
  document: PreviewDocument,
  blockId: string,
  text: string,
): PreviewDocument {
  return document.map((block) =>
    block.id === blockId ? { ...block, text } : block,
  );
}

/** Enter in a heading starts a paragraph; Enter in a paragraph stays one. */
export function roleForInsertedBlock(
  system: TypeSystem,
  currentRoleId: string,
): string {
  const current = resolveDocumentRole(system, currentRoleId);
  if (!current) return fallbackRoleId(system);
  const element = blockElementForRole(system, current);
  return element.startsWith("h") ? fallbackRoleId(system) : currentRoleId;
}

/**
 * Selected blocks that still exist, and the distinct roles they draw.
 *
 * Stale ids drop out when a merge or delete removes a block. The toolbar
 * needs both lists: the ids to restyle, and the roles to show as the value.
 */
export function selectedDocumentBlocks(
  document: PreviewDocument,
  selectedIds: readonly string[],
): { ids: string[]; roleIds: string[] } {
  const byId = new Map(document.map((block) => [block.id, block]));
  const ids: string[] = [];
  const roleIds: string[] = [];
  const seenRoles = new Set<string>();
  for (const id of selectedIds) {
    const block = byId.get(id);
    if (!block) continue;
    ids.push(id);
    if (seenRoles.has(block.roleId)) continue;
    seenRoles.add(block.roleId);
    roleIds.push(block.roleId);
  }
  return { ids, roleIds };
}

export function splitBlock(
  document: PreviewDocument,
  blockId: string,
  offset: number,
  newId: string,
  newRoleId: string,
): PreviewDocument {
  const index = document.findIndex((block) => block.id === blockId);
  const block = document[index];
  if (!block) return document;
  const at = Math.min(Math.max(0, offset), block.text.length);
  const before = { ...block, text: block.text.slice(0, at) };
  const after: PreviewDocumentBlock = {
    id: newId,
    roleId: newRoleId,
    text: block.text.slice(at),
  };
  return [
    ...document.slice(0, index),
    before,
    after,
    ...document.slice(index + 1),
  ];
}

/** Drop a block unless it is the last one. An empty document cannot be edited. */
export function removeBlock(
  document: PreviewDocument,
  blockId: string,
): PreviewDocument {
  if (document.length <= 1) {
    return document.map((block) =>
      block.id === blockId ? { ...block, text: "" } : block,
    );
  }
  return document.filter((block) => block.id !== blockId);
}

export function mergeBlockWithPrevious(
  document: PreviewDocument,
  blockId: string,
): PreviewDocument {
  const index = document.findIndex((block) => block.id === blockId);
  if (index <= 0) return removeBlock(document, blockId);
  const previous = document[index - 1]!;
  const current = document[index]!;
  const merged = {
    ...previous,
    text: `${previous.text}${current.text}`,
  };
  return [
    ...document.slice(0, index - 1),
    merged,
    ...document.slice(index + 1),
  ];
}

export function previewDocumentRoleOptions(system: TypeSystem): Array<{
  groupLabel: string;
  roles: Array<{ id: string; name: string }>;
}> {
  return system.groups
    .map((group) => ({
      groupLabel: group.label,
      roles: system.roles
        .filter((role) => role.groupId === group.id)
        .map((role) => ({ id: role.id, name: role.name })),
    }))
    .filter((group) => group.roles.length > 0);
}
