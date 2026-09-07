import { semanticId, type SemanticToken } from "./semantic";
import type { SemanticEdit } from "./selection-ops";
import { usedBy } from "./role-consumers";

/** The first identifier segment is the folder shown in the semantic table. */
export function groupOf(id: string): string {
  return id.split(".")[0] ?? id;
}

/** The part somebody edits after the table has already said the folder. */
export function shortName(id: string): string {
  const dot = id.indexOf(".");
  return dot === -1 ? id : id.slice(dot + 1);
}

/** Put an identifier into a folder without changing its short name. */
export function withGroup(id: string, group: string): string {
  return `${group}.${shortName(id)}`;
}

/**
 * Rename the name cell in the semantic spreadsheet. A dotted value is an
 * explicit folder move; an ordinary value stays in the current folder.
 */
export function renameTokenFromCell(
  layer: SemanticToken[],
  id: string,
  value: string,
): SemanticEdit {
  const token = layer.find((candidate) => candidate.id === id);
  if (!token) return { layer, refusals: [], removed: [], added: [] };

  const wanted = semanticId(value);
  if (!wanted) return { layer, refusals: [], removed: [], added: [] };

  const target = value.includes(".") ? wanted : withGroup(wanted, groupOf(id));
  if (target === id) return { layer, refusals: [], removed: [], added: [] };

  if (usedBy(id).length > 0) {
    return {
      layer,
      refusals: [
        {
          id,
          reason: `${id} cannot be ${
            groupOf(target) === groupOf(id)
              ? "renamed"
              : "moved to another group"
          }: it is read by name. Repoint it instead.`,
          usedBy: usedBy(id),
        },
      ],
      removed: [],
      added: [],
    };
  }

  const taken = new Set(layer.map((candidate) => candidate.id));
  let next = target;
  let suffix = 2;
  while (taken.has(next)) {
    next = `${target}.${suffix++}`;
  }

  return {
    layer: layer.map((candidate) =>
      candidate.id === id
        ? { ...candidate, id: next, name: shortName(next) }
        : candidate,
    ),
    refusals: [],
    removed: [],
    added: [],
  };
}
