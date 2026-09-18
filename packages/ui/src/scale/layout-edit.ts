import type {
  HybridTokenPreset,
  HybridTokenizedValue,
} from "../hybrid-tokenized-input";
import type { PreviewDevice } from "../typography/preview-devices";
import {
  fillLayoutDevices,
  formatLayoutRawPx,
  isLayoutCellValue,
  isLayoutPrimitive,
  parseLayoutRawPx,
  type LayoutToken,
  type LayoutTokenKind,
} from "./layout-tokens";

/**
 * Author operations on the layout uses list.
 *
 * Reading, filling frames, and CSS live in `layout-tokens.ts`. This file is
 * the mutations the Uses table calls: bind or type a cell, add, rename,
 * duplicate, delete, reorder.
 */

export function setLayoutReference(
  tokens: readonly LayoutToken[],
  tokenId: string,
  deviceId: string,
  cell: string,
): LayoutToken[] {
  return tokens.map((token) => {
    if (token.id !== tokenId) return token;
    if (!isLayoutCellValue(token.kind, cell)) return token;
    return {
      ...token,
      byDevice: { ...token.byDevice, [deviceId]: cell },
    };
  });
}

/** Bound chip when the cell names a primitive; raw number when it is typed px. */
export function hybridValueFromLayoutCell(
  kind: LayoutTokenKind,
  stored: string | undefined,
  presets: readonly HybridTokenPreset[],
): HybridTokenizedValue {
  if (stored && isLayoutPrimitive(kind, stored)) {
    const preset = presets.find((candidate) => candidate.id === stored);
    return {
      isPreset: true,
      presetId: stored,
      value: preset?.value ?? 0,
    };
  }
  const px = stored ? parseLayoutRawPx(stored) : undefined;
  if (px !== undefined) return { isPreset: false, value: px };
  const first = presets[0];
  return first
    ? { isPreset: true, presetId: first.id, value: first.value }
    : { isPreset: false, value: 0 };
}

export function layoutCellFromHybrid(next: HybridTokenizedValue): string {
  if (next.isPreset && next.presetId) return next.presetId;
  return formatLayoutRawPx(next.value);
}

function layoutIdFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueLayoutId(wanted: string, taken: Iterable<string>): string {
  const base = wanted || "use";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let suffix = 2;
  let id = `${base}-${suffix}`;
  while (used.has(id)) {
    suffix += 1;
    id = `${base}-${suffix}`;
  }
  return id;
}

function copyLayoutId(id: string, taken: Iterable<string>): string {
  const base = id.replace(/-copy(-\d+)?$/, "");
  return uniqueLayoutId(`${base}-copy`, taken);
}

/**
 * Append a use of this kind, copying pointers from the last row like it.
 *
 * A new row with empty cells cannot be previewed, and the first thing
 * anybody does is retarget it anyway.
 */
export function addLayoutToken(
  tokens: readonly LayoutToken[],
  kind: LayoutTokenKind,
  devices: readonly PreviewDevice[],
  label = kind === "radius" ? "New radius" : "New use",
): LayoutToken[] {
  const id = uniqueLayoutId(
    layoutIdFromName(label),
    tokens.map((token) => token.id),
  );
  const source = [...tokens].reverse().find((token) => token.kind === kind);
  return [
    ...tokens,
    fillLayoutDevices(
      {
        id,
        name: label,
        description: "",
        kind,
        byDevice: source ? { ...source.byDevice } : {},
      },
      devices,
    ),
  ];
}

/** Rename the use and the custom property it exports, together. */
export function renameLayoutToken(
  tokens: readonly LayoutToken[],
  id: string,
  name: string,
): LayoutToken[] {
  const token = tokens.find((candidate) => candidate.id === id);
  if (!token) return [...tokens];
  const trimmed = name.trim();
  if (!trimmed || trimmed === token.name) return [...tokens];
  const nextId = uniqueLayoutId(
    layoutIdFromName(trimmed) || token.id,
    tokens
      .filter((candidate) => candidate.id !== id)
      .map((candidate) => candidate.id),
  );
  return tokens.map((candidate) =>
    candidate.id === id
      ? { ...candidate, id: nextId, name: trimmed }
      : candidate,
  );
}

/** Copy a use directly under its source, with a new exported name. */
export function duplicateLayoutToken(
  tokens: readonly LayoutToken[],
  id: string,
): LayoutToken[] {
  const index = tokens.findIndex((token) => token.id === id);
  if (index === -1) return [...tokens];
  const token = tokens[index]!;
  const nextId = copyLayoutId(
    token.id,
    tokens.map((candidate) => candidate.id),
  );
  const copy: LayoutToken = {
    ...token,
    id: nextId,
    name: `${token.name} copy`,
    byDevice: { ...token.byDevice },
  };
  return [...tokens.slice(0, index + 1), copy, ...tokens.slice(index + 1)];
}

export function removeLayoutToken(
  tokens: readonly LayoutToken[],
  id: string,
): LayoutToken[] {
  return tokens.filter((token) => token.id !== id);
}

/**
 * Move one use onto another row's slot.
 *
 * Same-kind only: Spacing Uses cannot drop onto a radius row that is not
 * even on the table.
 */
export function reorderLayoutTokens(
  tokens: readonly LayoutToken[],
  activeId: string,
  overId: string,
): LayoutToken[] {
  const from = tokens.findIndex((token) => token.id === activeId);
  const to = tokens.findIndex((token) => token.id === overId);
  if (from === -1 || to === -1 || from === to) return [...tokens];
  if (tokens[from]!.kind !== tokens[to]!.kind) return [...tokens];
  const next = [...tokens];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}
