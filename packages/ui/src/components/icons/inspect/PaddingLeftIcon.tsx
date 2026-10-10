import type { SVGProps } from "react";

/**
 * Padding on the left.
 *
 * From the Figma inspect panel, as drawn there: the paths are Figma's, and
 * only the colour is changed, from the panel's white to `currentColor`, so
 * it follows whatever text colour its parent sets. Filled rather than
 * stroked. Its box is 24 by 24; it takes a size from its caller
 * like any other.
 */
export function PaddingLeftIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M16.5 6C16.8978 6 17.2794 6.15804 17.5607 6.43934C17.842 6.72064 18 7.10218 18 7.5V16.5C18 16.8978 17.842 17.2794 17.5607 17.5607C17.2794 17.842 16.8978 18 16.5 18H7.5C7.10218 18 6.72064 17.842 6.43934 17.5607C6.15804 17.2794 6 16.8978 6 16.5V7.5C6 7.10218 6.15804 6.72064 6.43934 6.43934C6.72064 6.15804 7.10218 6 7.5 6H16.5ZM7.5 7C7.36739 7 7.24021 7.05268 7.14645 7.14645C7.05268 7.24021 7 7.36739 7 7.5V16.5C7 16.6326 7.05268 16.7598 7.14645 16.8536C7.24021 16.9473 7.36739 17 7.5 17H16.5C16.6326 17 16.7598 16.9473 16.8536 16.8536C16.9473 16.7598 17 16.6326 17 16.5V7.5C17 7.36739 16.9473 7.24021 16.8536 7.14645C16.7598 7.05268 16.6326 7 16.5 7H7.5ZM8.5 8C8.63261 8 8.75979 8.05268 8.85355 8.14645C8.94732 8.24021 9 8.36739 9 8.5V15.5C9 15.6326 8.94732 15.7598 8.85355 15.8536C8.75979 15.9473 8.63261 16 8.5 16C8.36739 16 8.24021 15.9473 8.14645 15.8536C8.05268 15.7598 8 15.6326 8 15.5V8.5C8 8.36739 8.05268 8.24021 8.14645 8.14645C8.24021 8.05268 8.36739 8 8.5 8Z"
        fill="currentColor"
        fillOpacity="0.698"
      />
    </svg>
  );
}
