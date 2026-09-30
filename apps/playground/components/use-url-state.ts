"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { studioViewParam, withStudioParam } from "@blueprint/ui";
import { saveStudioView } from "./studio-view-memory";

/* The query string is read straight from the address, through
   `useSyncExternalStore`, and not through `useSearchParams`. That hook makes a
   prerendered page bail out to the client and demands a `<Suspense>` boundary
   to build, and the boundary lets the studio hydrate after the workspace has
   loaded, so its "Loading…" page and the server's disagree and hydration
   fails. Here the server's snapshot is the empty query, the studio opens on
   its defaults there, and React re-reads the address once it has hydrated,
   with no mismatch to report. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  /* Back and Forward. A change made here is announced by `notify`. */
  window.addEventListener("popstate", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

const clientSearch = () => window.location.search;
const serverSearch = () => "";

/**
 * A studio's view or tab, kept in a query parameter.
 *
 * Read from the URL, so Back and Forward move between tabs, a refresh keeps
 * the tab, and a link can carry it. Written with `history.pushState`, which
 * Next's router picks up with no request to the server and no reload:
 * `router.replace` would add no history entry, and Back would skip every tab.
 * A value equal to the default is left out of the address, and an unknown one
 * reads as the default.
 */
export function useUrlState<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): readonly [T, (next: T) => void] {
  /* Read so the hook renders again on a route change: a navigation made by a
     link changes the address without a \`popstate\`. */
  const pathname = usePathname();
  const search = useSyncExternalStore(subscribe, clientSearch, serverSearch);
  const value = studioViewParam(
    new URLSearchParams(search).get(key),
    allowed,
    fallback,
  );

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
      notify();
    },
    [key, fallback],
  );

  return [value, set] as const;
}
