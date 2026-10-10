import type { SVGProps } from "react";

/**
 * Adds a stroke or an effect.
 *
 * From the Figma inspect panel, as drawn there: the paths are Figma's, and
 * only the colour is changed, from the panel's white to `currentColor`, so
 * it follows whatever text colour its parent sets. Filled rather than
 * stroked. Its box is 24 by 24; it takes a size from its caller
 * like any other.
 */
export function PlusIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M11.5 6C11.6326 6 11.7598 6.05268 11.8536 6.14645C11.9473 6.24021 12 6.36739 12 6.5V11H16.5C16.6326 11 16.7598 11.0527 16.8536 11.1464C16.9473 11.2402 17 11.3674 17 11.5C17 11.6326 16.9473 11.7598 16.8536 11.8536C16.7598 11.9473 16.6326 12 16.5 12H12V16.5C12 16.6326 11.9473 16.7598 11.8536 16.8536C11.7598 16.9473 11.6326 17 11.5 17C11.3674 17 11.2402 16.9473 11.1464 16.8536C11.0527 16.7598 11 16.6326 11 16.5V12H6.5C6.36739 12 6.24021 11.9473 6.14645 11.8536C6.05268 11.7598 6 11.6326 6 11.5C6 11.3674 6.05268 11.2402 6.14645 11.1464C6.24021 11.0527 6.36739 11 6.5 11H11V6.5C11 6.36739 11.0527 6.24021 11.1464 6.14645C11.2402 6.05268 11.3674 6 11.5 6Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        fillOpacity="0.698"
      />
    </svg>
  );
}
