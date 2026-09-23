"use client";

import { useMediaQuery } from "@astryxdesign/core/hooks";

/**
 * The width below which the studio is laid out for a phone.
 *
 * Every phone rule in the stylesheets is `@media (max-width: 640px)`; CSS
 * cannot import this, so the number is written there too. Change both.
 */
export const PHONE_MEDIA_QUERY = "(max-width: 640px)";

/**
 * Whether the screen is a phone's.
 *
 * False on the first render, as `useMediaQuery` always is: the server cannot
 * know the width. Anything that must be right from the first frame is hidden
 * or shown in CSS as well, and this only decides what to mount.
 */
export function useIsPhone(): boolean {
  return useMediaQuery(PHONE_MEDIA_QUERY);
}
