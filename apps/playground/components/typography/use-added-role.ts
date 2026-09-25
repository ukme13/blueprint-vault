"use client";

import { useState } from "react";
import { newRoleEnd, type TypeGroup, type TypeRole } from "@blueprint/ui";

/**
 * The id of the role that was just added to a group, or null.
 *
 * A size group takes a new role at the top, above the rows the Add button sits
 * under, so without a cue the click can look as if it did nothing. The row
 * this returns plays an entrance and is scrolled to.
 *
 * Found by position, the end `newRoleEnd` names, rather than by the id that is
 * new: a group of one going to two renames its first role as well (`caption`
 * becomes `caption-1`), so two ids are new and only one role is.
 *
 * Worked out during render rather than in an effect, so the row mounts already
 * marked: marked a frame later, it would show, vanish, and fade back in.
 */
export function useAddedRoleId(
  group: TypeGroup,
  roles: TypeRole[],
): string | null {
  const ids = roles.map((role) => role.id).join(" ");
  const [seen, setSeen] = useState({ ids, count: roles.length });
  const [addedId, setAddedId] = useState<string | null>(null);

  if (ids !== seen.ids) {
    /* Anything else that changes the ids — a removal, a rename, an indexing
       switch — clears the mark, so it never lands on a role it did not mean. */
    const added =
      roles.length === seen.count + 1
        ? newRoleEnd(group) === "start"
          ? roles[0]
          : roles[roles.length - 1]
        : undefined;
    setSeen({ ids, count: roles.length });
    setAddedId(added?.id ?? null);
  }

  return addedId;
}
