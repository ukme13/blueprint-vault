import type {
  HybridTokenPreset,
  HybridTokenizedValue,
} from "../hybrid-tokenized-input";
import type { PreviewDevice } from "../typography/preview-devices";
import {
  DEFAULT_LAYOUT_TOKENS,
  defaultSystemLayoutToken,
  fillLayoutDevices,
  formatLayoutRawPx,
  isSystemLayoutToken,
  isLayoutCellValue,
  isLayoutPrimitive,
  parseLayoutRawPx,
  SQUISH_SOURCES,
  type LayoutToken,
  type LayoutTokenKind,
  type SquishRatio,
} from "./layout-tokens";
import { uniqueTokenName } from "./token-names";

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
      /* Typed while squished: this frame keeps its own value from now on. */
      ...(typeof token.squish === "number"
        ? {
            squishOverrides: [
              ...new Set([...(token.squishOverrides ?? []), deviceId]),
            ],
          }
        : {}),
    };
  });
}

/**
 * Choose how a squished use follows its source: a ratio, or Custom (null).
 *
 * Picking a ratio is asking every frame to follow it, so any typed frame
 * goes back to following; the values themselves are filled in by
 * `syncSquishInsets` when the edit is written. Custom keeps the values as
 * they are, each frame now set by hand.
 */
export function setLayoutSquish(
  tokens: readonly LayoutToken[],
  tokenId: string,
  squish: SquishRatio | null,
): LayoutToken[] {
  return tokens.map((token) => {
    if (token.id !== tokenId || !(token.id in SQUISH_SOURCES)) return token;
    if (squish === null) {
      const custom: LayoutToken = { ...token, squish: null };
      delete custom.squishOverrides;
      return custom;
    }
    const following: LayoutToken = { ...token, squish };
    delete following.squishOverrides;
    return following;
  });
}

/** Put one typed frame back on the squish. Its value follows on write. */
export function clearLayoutSquishOverride(
  tokens: readonly LayoutToken[],
  tokenId: string,
  deviceId: string,
): LayoutToken[] {
  return tokens.map((token) => {
    if (token.id !== tokenId || !token.squishOverrides?.includes(deviceId)) {
      return token;
    }
    const rest = token.squishOverrides.filter((id) => id !== deviceId);
    const next: LayoutToken = { ...token, squishOverrides: rest };
    if (rest.length === 0) delete next.squishOverrides;
    return next;
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

/**
 * A name and id no other use has, nor any system use, whether or not it is
 * in this list: a system use missing from the list is restored on the next
 * load, so a custom one holding its name now would collide then.
 */
function uniqueLayoutName(
  wanted: string,
  tokens: readonly LayoutToken[],
  exceptId?: string,
): { id: string; name: string } {
  const others = [...tokens, ...DEFAULT_LAYOUT_TOKENS].filter(
    (token) => token.id !== exceptId,
  );
  return uniqueTokenName(
    wanted,
    {
      ids: others.map((token) => token.id),
      names: others.map((token) => token.name),
    },
    "use",
  );
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
  const { id, name } = uniqueLayoutName(label, tokens);
  const source = [...tokens].reverse().find((token) => token.kind === kind);
  return [
    ...tokens,
    fillLayoutDevices(
      {
        id,
        name,
        description: "",
        kind,
        byDevice: source ? { ...source.byDevice } : {},
      },
      devices,
    ),
  ];
}

/**
 * Rename the use and the custom property it exports, together.
 *
 * A system use keeps its name: the preview and the export depend on its id.
 * A name another use already has, in any case or word order, takes the
 * lowest free number instead.
 */
export function renameLayoutToken(
  tokens: readonly LayoutToken[],
  id: string,
  name: string,
): LayoutToken[] {
  if (isSystemLayoutToken(id)) return [...tokens];
  const token = tokens.find((candidate) => candidate.id === id);
  if (!token) return [...tokens];
  const trimmed = name.trim();
  if (!trimmed || trimmed === token.name) return [...tokens];
  const next = uniqueLayoutName(trimmed, tokens, id);
  return tokens.map((candidate) =>
    candidate.id === id ? { ...candidate, ...next } : candidate,
  );
}

/**
 * Copy a use directly under its source, with a new exported name.
 *
 * Not a system use: a copy of Button radius would be a second button corner
 * that nothing reads. Point a custom use at the same radius instead.
 */
export function duplicateLayoutToken(
  tokens: readonly LayoutToken[],
  id: string,
): LayoutToken[] {
  if (isSystemLayoutToken(id)) return [...tokens];
  const index = tokens.findIndex((token) => token.id === id);
  if (index === -1) return [...tokens];
  const token = tokens[index]!;
  const copy: LayoutToken = {
    ...token,
    ...uniqueLayoutName(
      `${token.name.replace(/ copy( \d+)?$/, "")} copy`,
      tokens,
    ),
    byDevice: { ...token.byDevice },
  };
  return [...tokens.slice(0, index + 1), copy, ...tokens.slice(index + 1)];
}

/** Delete a custom use. A system use stays; reset it instead. */
export function removeLayoutToken(
  tokens: readonly LayoutToken[],
  id: string,
): LayoutToken[] {
  if (isSystemLayoutToken(id)) return [...tokens];
  return tokens.filter((token) => token.id !== id);
}

/**
 * Put a system use's pointers back to how it ships, on every frame.
 *
 * Its name and description are already its own; only where it points has
 * changed. Nothing for a custom use, which has no default to go back to.
 */
export function resetLayoutToken(
  tokens: readonly LayoutToken[],
  id: string,
  devices: readonly PreviewDevice[],
): LayoutToken[] {
  const fresh = defaultSystemLayoutToken(id, devices);
  if (!fresh) return [...tokens];
  return tokens.map((token) => (token.id === id ? fresh : token));
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
