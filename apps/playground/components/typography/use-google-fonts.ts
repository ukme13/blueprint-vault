import { useEffect } from "react";
import { googleFontsHref, type TypeFont, type TypeSystem } from "@blueprint/ui";

/**
 * Loads whatever Google families the system names, in one request, and keeps
 * the stylesheet in sync as fonts and weights change.
 *
 * next/font cannot do this: it downloads at build time and needs the family
 * known then, which a picker over the whole catalogue rules out. The cost is
 * that the browser now talks to fonts.googleapis.com.
 */
export function useGoogleFontsLink(
  system: TypeSystem | null,
  previewFont: TypeFont | undefined,
  previewWeight: number,
): void {
  /* Built every render rather than memoised: it is a handful of array walks,
     and the effect below depends on the resulting string, so value equality
     already stops the stylesheet being replaced when nothing changed. */
  const href = ((): string | null => {
    if (!system) return null;
    const weightsByFamily = new Map<string, Set<number>>();

    const want = (family: string, weight: number) => {
      const weights = weightsByFamily.get(family) ?? new Set<number>();
      weights.add(weight);
      weightsByFamily.set(family, weights);
    };

    system.roles.forEach((role) => {
      const font = system.fonts.find(
        (candidate) => candidate.id === role.fontId,
      );
      /* Every family in the stack, not just the first. A fallback that is never
         downloaded cannot be fallen back to: the browser skips it and lands on
         the generic, which reads as the fallback being ignored. */
      font?.families.forEach((family) => want(family, role.fontWeight));
    });

    /* The previewed weight too. Without it the step list renders a weight that
       was never downloaded, and the browser draws a synthetic one. */
    previewFont?.families.forEach((family) => want(family, previewWeight));

    return googleFontsHref(
      [...weightsByFamily].map(([family, weights]) => ({
        family,
        weights: [...weights],
      })),
    );
  })();

  useEffect(() => {
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.append(link);
    /* Removed on change so switching fonts does not leave a stack of dead
       stylesheets behind. */
    return () => link.remove();
  }, [href]);
}
