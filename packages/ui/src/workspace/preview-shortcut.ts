/**
 * Space toggles the current studio with `/preview`.
 *
 * The destination is a function of the path, not of React: the shell stores
 * the return path and asks here where to go. Home is not a studio, and
 * preview must not remember itself as the place to come back to.
 */

const PREVIEW_PATH = "/preview";

export function previewShortcutDestination(
  pathname: string,
  returnPath: string | null,
): string {
  if (isPreviewPath(pathname)) {
    if (returnPath && returnPath !== "/" && !isPreviewPath(returnPath)) {
      return returnPath;
    }
    return "/colour";
  }
  return PREVIEW_PATH;
}

/** The path to remember before leaving a studio for preview. */
export function previewShortcutReturnPath(pathname: string): string | null {
  if (pathname === "/" || isPreviewPath(pathname)) return null;
  return pathname;
}

function isPreviewPath(pathname: string): boolean {
  return pathname === PREVIEW_PATH || pathname.startsWith(`${PREVIEW_PATH}/`);
}
