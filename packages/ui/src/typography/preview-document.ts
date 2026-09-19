import { ARTICLE_COPY, type ArticleCopy } from "./article-copy";
import {
  PREVIEW_LANDING_SLOTS,
  refreshRetiredLandingCopy,
} from "./landing-copy";
import { resolveTemplateSlot } from "./role-rows";
import {
  PREVIEW_SHELL_COPY,
  PREVIEW_STYLE_GROUPS,
  SHELL_SLOTS,
  idsSharingStyle,
  refreshRetiredShellCopy,
} from "./preview-shell";
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
  /**
   * A semantic token id (`fg.primary`). Missing means the CSS module default.
   */
  colorTokenId?: string;
  /**
   * When true, colour writes to the style group skip this slot.
   * Missing is grouped, like type role.
   */
  colorDetached?: boolean;
}

export type PreviewDocument = PreviewDocumentBlock[];

export {
  idsSharingStyle,
  PREVIEW_FOOTER_COLUMNS,
  PREVIEW_FOOTER_BASE_IDS,
  PREVIEW_NAV_LINK_IDS,
  PREVIEW_SHELL_COPY,
  PREVIEW_SHELL_IDS,
  PREVIEW_SHELL_LABEL,
  PREVIEW_STYLE_GROUPS,
  previewInspectorChrome,
  previewSlotLabel,
  previewStyleGroupFor,
  type PreviewShellId,
  type PreviewStyleGroup,
} from "./preview-shell";

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

function readBlock(value: unknown): PreviewDocumentBlock | null {
  if (!isBlock(value)) return null;
  const colorTokenId =
    typeof value.colorTokenId === "string" && value.colorTokenId.length > 0
      ? value.colorTokenId
      : undefined;
  const colorDetached = value.colorDetached === true ? true : undefined;
  return {
    id: value.id,
    roleId: value.roleId,
    text: value.text,
    ...(colorTokenId ? { colorTokenId } : {}),
    ...(colorDetached ? { colorDetached } : {}),
  };
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
  const blocks = value.flatMap((entry) => {
    const block = readBlock(entry);
    return block ? [block] : [];
  });
  return blocks.length > 0 ? blocks : seedPreviewDocument(system);
}

/** Starter chrome for `/preview`: brand, nav, sign-up, login, a footer line. */
export function seedPreviewShell(system: TypeSystem): PreviewDocument {
  return SHELL_SLOTS.map((entry) => ({
    id: entry.id,
    roleId: slotRoleId(system, entry.slot),
    text: PREVIEW_SHELL_COPY[entry.id],
  }));
}

/**
 * A stored frozen document, or the seed. Always the seed ids, in seed order.
 *
 * Unknown ids are dropped so the inspector cannot grow a page builder. A
 * missing known id is filled from the seed rather than leaving a hole.
 */
export function readFrozenPreviewDocument(
  value: unknown,
  seeded: PreviewDocument,
): PreviewDocument {
  if (!Array.isArray(value)) return seeded;
  const byId = new Map(
    value.flatMap((entry) => {
      const block = readBlock(entry);
      return block ? [[block.id, block] as const] : [];
    }),
  );
  return seeded.map((slot) => byId.get(slot.id) ?? slot);
}

/**
 * A stored shell, or the seed. Always the known chrome ids, in seed order.
 */
export function readPreviewShell(
  value: unknown,
  system: TypeSystem,
): PreviewDocument {
  return syncStyleGroupColors(
    syncStyleGroupRoles(
      refreshRetiredShellCopy(
        readFrozenPreviewDocument(value, seedPreviewShell(system)),
      ),
    ),
  );
}

/**
 * One role per style group, taken from the first member that exists.
 *
 * Older saves could restyle Home without Features. After this, a read snaps
 * the rest of the group to that first stored role rather than leaving a
 * mixed set that the inspector claims is shared.
 */
export function syncStyleGroupRoles(
  document: PreviewDocument,
): PreviewDocument {
  let next = document;
  for (const group of PREVIEW_STYLE_GROUPS) {
    const first = next.find((block) => group.ids.includes(block.id));
    if (!first) continue;
    next = applyRoleToBlocks(next, [...group.ids], first.roleId);
  }
  return next;
}

/** Starter landing copy for `/preview`. Typography's article is not this. */
export function seedPreviewLanding(system: TypeSystem): PreviewDocument {
  return syncStyleGroupRoles(
    PREVIEW_LANDING_SLOTS.map((entry) => ({
      id: entry.id,
      roleId:
        entry.id === "landing-hero-title"
          ? pageTitleRoleId(system)
          : slotRoleId(system, entry.slot),
      text: entry.text,
    })),
  );
}

export function readPreviewLanding(
  value: unknown,
  system: TypeSystem,
): PreviewDocument {
  return syncStyleGroupColors(
    syncStyleGroupRoles(
      refreshRetiredLandingCopy(
        readFrozenPreviewDocument(value, seedPreviewLanding(system)),
      ),
    ),
  );
}

export function previewBlock(
  document: PreviewDocument,
  id: string,
): PreviewDocumentBlock | undefined {
  return document.find((block) => block.id === id);
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

export function applyColorToBlocks(
  document: PreviewDocument,
  blockIds: readonly string[],
  colorTokenId: string | undefined,
): PreviewDocument {
  if (blockIds.length === 0) return document;
  const selected = new Set(blockIds);
  return document.map((block) => {
    if (!selected.has(block.id)) return block;
    if (!colorTokenId) {
      const next = { ...block };
      delete next.colorTokenId;
      return next;
    }
    return { ...block, colorTokenId };
  });
}

/** Colour writes to the group, skipping slots that opted out. */
export function applyColorToStyleGroup(
  document: PreviewDocument,
  slotId: string,
  colorTokenId: string | undefined,
): PreviewDocument {
  const group = idsSharingStyle(slotId);
  const current = document.find((block) => block.id === slotId);
  if (current?.colorDetached) {
    return applyColorToBlocks(document, [slotId], colorTokenId);
  }
  const attached = group.filter((id) => {
    const block = document.find((entry) => entry.id === id);
    return block && !block.colorDetached;
  });
  return applyColorToBlocks(document, attached, colorTokenId);
}

export function detachSlotColor(
  document: PreviewDocument,
  slotId: string,
): PreviewDocument {
  return document.map((block) =>
    block.id === slotId ? { ...block, colorDetached: true } : block,
  );
}

/** Snap the group to this slot's colour and join them again. */
export function attachGroupColor(
  document: PreviewDocument,
  slotId: string,
): PreviewDocument {
  const current = document.find((block) => block.id === slotId);
  const group = idsSharingStyle(slotId);
  const selected = new Set(group);
  return document.map((block) => {
    if (!selected.has(block.id)) return block;
    const next = { ...block };
    delete next.colorDetached;
    if (current?.colorTokenId) next.colorTokenId = current.colorTokenId;
    else delete next.colorTokenId;
    return next;
  });
}

/**
 * One colour per style group among slots that still follow the group.
 *
 * Detached slots keep whatever they stored. Attached slots snap to the first
 * attached member that has a token, so a mixed save is not a mixed paint.
 */
export function syncStyleGroupColors(
  document: PreviewDocument,
): PreviewDocument {
  let next = document;
  for (const group of PREVIEW_STYLE_GROUPS) {
    const attached = next.filter(
      (block) => group.ids.includes(block.id) && !block.colorDetached,
    );
    const leader = attached.find((block) => block.colorTokenId) ?? attached[0];
    if (!leader) continue;
    next = applyColorToBlocks(
      next,
      attached.map((block) => block.id),
      leader.colorTokenId,
    );
  }
  return next;
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
