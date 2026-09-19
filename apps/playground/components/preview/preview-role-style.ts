import type { CSSProperties } from "react";
import { typeRoleVariables } from "@blueprint/ui";

/** A block painted from the type tokens the export would emit for this role. */
export function typeRoleStyle(roleId: string): CSSProperties {
  const vars = typeRoleVariables(roleId);
  return {
    fontFamily: `var(${vars.family})`,
    fontSize: `var(${vars.size})`,
    fontWeight: `var(${vars.weight})`,
    lineHeight: `var(${vars.lineHeight})`,
    letterSpacing: `var(${vars.letterSpacing})`,
    textTransform: `var(${vars.transform})` as CSSProperties["textTransform"],
  };
}
