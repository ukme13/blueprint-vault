import type { SVGProps } from "react";

/**
 * Takes a fill, a stroke or an effect away.
 *
 * From the Figma inspect panel, as drawn there: the paths are Figma's, and
 * only the colour is changed, from the panel's white to `currentColor`, so
 * it follows whatever text colour its parent sets. Filled rather than
 * stroked. Its box is 24 by 24; it takes a size from its caller
 * like any other.
 */
export function MinusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6 11.5C6 11.3674 6.05268 11.2402 6.14645 11.1464C6.24021 11.0527 6.36739 11 6.5 11H17.5C17.6326 11 17.7598 11.0527 17.8536 11.1464C17.9473 11.2402 18 11.3674 18 11.5C18 11.6326 17.9473 11.7598 17.8536 11.8536C17.7598 11.9473 17.6326 12 17.5 12H6.5C6.36739 12 6.24021 11.9473 6.14645 11.8536C6.05268 11.7598 6 11.6326 6 11.5Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
      />
    </svg>
  );
}
