"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { studioViewParam, withStudioParam } from "@blueprint/ui";
import { saveStudioView } from "./studio-view-memory";

/**
 * A studio's view or tab, kept in a query parameter.
 *
 * Read from the URL, so Back and Forward move between tabs, a refresh keeps
 * the tab, and a link can carry it. Written with `history.pushState`, which
 * Next's router picks up and reflects in `useSearchParams` with no request
 * to the server and no reload: `router.replace` would add no history entry,
 * and Back would skip every tab. A value equal to the default is left out of
 * the address, and an unknown one reads as the default.
 *
 * Needs a `<Suspense>` boundary above it: a prerendered page that reads the
 * search params fails to build without one.
 */
export function useUrlState<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): readonly [T, (next: T) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = studioViewParam(searchParams.get(key), allowed, fallback);
  const search = searchParams.toString();

  /* Remembered on every change, Back and Forward included, so the sidebar's
     link to this studio is where it was left. */
  useEffect(() => {
    saveStudioView(pathname, search);
  }, [pathname, search]);

  const set = useCallback(
    (next: T) => {
      const query = withStudioParam(
        window.location.search,
        key,
        next,
        fallback,
      );
      /* The same address is not a new place to go back to. */
      if (query === window.location.search.replace(/^\?/, "")) return;
      const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      window.history.pushState(null, "", url);
    },
    [key, fallback],
  );

  return [value, set] as const;
}
