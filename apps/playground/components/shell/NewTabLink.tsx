import type { AnchorHTMLAttributes, Ref } from "react";

/**
 * A plain anchor that opens in a new tab.
 *
 * For the one rail item that leaves the app. `SideNavItem` does not declare
 * `target` or `rel` — its props come from `BaseProps`, which omits `rel` and
 * never had `target` — but it does take `as` for a custom link component, so
 * the new-tab behaviour lives here instead of in a cast. A plain `<a>` rather
 * than Next's `Link`, because the destination is another application.
 */
export function NewTabLink({
  ref,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>;
}) {
  return <a ref={ref} {...props} rel="noreferrer" target="_blank" />;
}
