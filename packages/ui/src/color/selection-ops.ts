import { listConsumers, usedBy } from "./role-consumers";
import type { SemanticReference, SemanticToken } from "./semantic";
import type { ColourMode } from "./semantic";

/**
 * Bulk edits to a semantic layer, as pure functions.
 *
 * Every operation the spreadsheet offers is here rather than in the editor, so
 * each is testable without a browser, undo is a stack of layers rather than a
 * stack of reversed actions, and no keyboard path or future caller can reach a
 * rule the menu enforces. The plan's first safety rule is exactly this: a bulk
 * operation is a pure function with a test before it has a button.
 *
 * Nothing throws. Every one of these can be asked to do something it must not,
 * and a bulk edit that threw would abandon the nineteen rows it could have done
 * because of the twentieth. So each returns the layer it managed and a list of
 * what it would not do and why — one shape, so stage 4 has one thing to render.
 *
 * See docs/roadmap/semantic-table-editor.md.
 */

/** Why one id was left alone. */
export interface SemanticRefusal {
  /** The token that was not changed. */
  id: string;
  /** One sentence, in the words somebody should be shown. */
  reason: string;
  /**
   * What reads the role, when that is why.
   *
   * Empty for a refusal that is not about consumers — a collision, or an id
   * that is not in the layer. The list is here rather than folded into the
   * sentence so the editor can render it as a badge per consumer.
   */
  usedBy: string[];
}

/** Every operation's answer: what the layer became, and what it would not do. */
export interface SemanticEdit {
  layer: SemanticToken[];
  refusals: SemanticRefusal[];
  /**
   * Seed roles this edit deleted.
   *
   * Only `deleteTokens` ever fills it. It belongs in the answer rather than in
   * a side effect because the caller has to write it into the slice: a role
   * somebody deliberately removed has to stay removed, and `fillSeedRoles`
   * would otherwise put it back on the next read.
   */
  removed: string[];
  /**
   * Ids this edit brought into the layer.
   *
   * The other half of the same bookkeeping. Adding a token back under an id
   * that was deliberately removed is somebody changing their mind, and the
   * removed list has to forget it.
   */
  added: string[];
}

function edit(
  layer: SemanticToken[],
  refusals: SemanticRefusal[] = [],
  removed: string[] = [],
  added: string[] = [],
): SemanticEdit {
  return { layer, refusals, removed, added };
}

/** The refusal every operation gives for an id that is not in the layer. */
function notHere(id: string): SemanticRefusal {
  return {
    id,
    reason: `There is no token called ${id}.`,
    usedBy: [],
  };
}

/** The refusal for a role something reads by name. */
function loadBearing(id: string, verb: string): SemanticRefusal {
  const consumers = usedBy(id);
  return {
    id,
    reason: `${id} cannot be ${verb}: ${listConsumers(consumers)} ${consumers.length === 1 ? "reads" : "read"} it by name. Repoint it instead.`,
    usedBy: consumers,
  };
}

/**
 * Delete every id that nothing reads, and say why about the rest.
 *
 * The refusal is enforced here rather than only in the menu, which is the
 * plan's second safety rule: no keyboard path, no context menu somebody adds
 * later and no future caller can take `action.primary` out from under the
 * Button. A mixed selection deletes what it can — abandoning nineteen good
 * rows because of one load-bearing one is not a safer answer, it is a less
 * useful one.
 */
export function deleteTokens(
  layer: SemanticToken[],
  ids: readonly string[],
): SemanticEdit {
  const present = new Set(layer.map((token) => token.id));
  const refusals: SemanticRefusal[] = [];
  const deleting = new Set<string>();

  for (const id of ids) {
    if (!present.has(id)) {
      refusals.push(notHere(id));
      continue;
    }
    if (usedBy(id).length > 0) {
      refusals.push(loadBearing(id, "deleted"));
      continue;
    }
    deleting.add(id);
  }

  return edit(
    layer.filter((token) => !deleting.has(token.id)),
    refusals,
    [...deleting],
  );
}

/**
 * An id for a copy that cannot collide.
 *
 * `border.subtle` becomes `border.subtle-copy`, then `-copy-2`. The suffix goes
 * on the whole id rather than inside it because the part before the dot is the
 * group, and a copy belongs in the same group as the thing it came from.
 *
 * Copying a copy gives `border.subtle-copy-2` rather than
 * `border.subtle-copy-copy`, which is the answer somebody expects after the
 * third one.
 */
function copyId(id: string, taken: Set<string>): string {
  const base = id.replace(/-copy(-\d+)?$/, "");
  let candidate = `${base}-copy`;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-copy-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Copy each id, alpha and all, directly after the token it came from.
 *
 * Directly after rather than appended, because order in this table is the
 * order somebody arranged and a duplicate that jumps to the bottom is a
 * duplicate somebody then has to go and find.
 *
 * The copy carries the whole reference, transparency included — a duplicate
 * that came back opaque would be a different token wearing the same colour.
 * Its `usedBy` is empty by construction: the id is new, so nothing anywhere
 * can have been written against it.
 */
export function duplicateTokens(
  layer: SemanticToken[],
  ids: readonly string[],
): SemanticEdit {
  const present = new Set(layer.map((token) => token.id));
  const refusals = ids
    .filter((id) => !present.has(id))
    .map((id) => notHere(id));

  const wanted = new Set(ids.filter((id) => present.has(id)));
  if (wanted.size === 0) return edit(layer, refusals);

  /* One growing set, so two copies made in the same call cannot both take
     `-copy`. Seeded with the whole layer, not only the ids being copied. */
  const taken = new Set(present);
  const added: string[] = [];

  const next = layer.flatMap((token) => {
    if (!wanted.has(token.id)) return [token];

    const id = copyId(token.id, taken);
    taken.add(id);
    added.push(id);

    return [
      token,
      {
        ...token,
        id,
        name: `${token.name} copy`,
        light: { ...token.light },
        dark: { ...token.dark },
      },
    ];
  });

  return edit(next, refusals, [], added);
}

/** `action.primary` in group `brand` is `brand.primary`. */
function regroup(id: string, group: string): string {
  const dot = id.indexOf(".");
  return dot === -1 ? `${group}.${id}` : `${group}${id.slice(dot)}`;
}

/**
 * Move tokens into a group by renaming the part before the dot.
 *
 * A group is a prefix — that is what the export, the docs pages and the report
 * already treat it as — so moving between groups is a rename and nothing else.
 * Order is untouched: a token that was fourth stays fourth.
 *
 * Two refusals, and both are about the id being the exported name. A collision
 * would put two tokens on one custom property and let the later silently win.
 * A load-bearing role would take its name with it, which is the same as
 * deleting it as far as everything reading that name is concerned — the Button
 * asks for `--color-action-primary`, not for "whatever the primary tone is
 * called now".
 */
export function moveToGroup(
  layer: SemanticToken[],
  ids: readonly string[],
  group: string,
): SemanticEdit {
  const present = new Set(layer.map((token) => token.id));
  const refusals: SemanticRefusal[] = [];
  const renames = new Map<string, string>();
  const taken = new Set(present);

  for (const id of ids) {
    if (!present.has(id)) {
      refusals.push(notHere(id));
      continue;
    }

    const next = regroup(id, group);
    if (next === id) continue;

    if (usedBy(id).length > 0) {
      refusals.push(loadBearing(id, "moved to another group"));
      continue;
    }
    if (taken.has(next)) {
      refusals.push({
        id,
        reason: `${id} cannot move to ${group}: there is already a token called ${next}.`,
        usedBy: [],
      });
      continue;
    }

    renames.set(id, next);
    taken.add(next);
    taken.delete(id);
  }

  return edit(
    layer.map((token) => {
      const next = renames.get(token.id);
      return next ? { ...token, id: next } : token;
    }),
    refusals,
  );
}

/**
 * Point one mode of every selected token somewhere else.
 *
 * The alpha survives unless the new reference carries one of its own. That is
 * not a nicety: rebuilding a reference from a track and a weight is exactly how
 * the editor was silently making transparent tokens solid every time somebody
 * changed a shade, which is the bug stage 1 found. A caller that means "and
 * make it opaque" says so by passing `alpha: 1`.
 *
 * No load-bearing refusal, because repointing is the answer to one — a role
 * something reads by name keeps its name and changes what it points at, which
 * is the whole reason the layer is an indirection.
 */
export function repointTokens(
  layer: SemanticToken[],
  ids: readonly string[],
  mode: ColourMode,
  reference: SemanticReference,
): SemanticEdit {
  const present = new Set(layer.map((token) => token.id));
  const refusals = ids
    .filter((id) => !present.has(id))
    .map((id) => notHere(id));

  const wanted = new Set(ids.filter((id) => present.has(id)));

  return edit(
    layer.map((token) => {
      if (!wanted.has(token.id)) return token;

      const alpha =
        reference.alpha === undefined ? token[mode].alpha : reference.alpha;

      return {
        ...token,
        [mode]:
          alpha === undefined
            ? { trackId: reference.trackId, weight: reference.weight }
            : { trackId: reference.trackId, weight: reference.weight, alpha },
      };
    }),
    refusals,
  );
}
