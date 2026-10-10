import type { SVGProps } from "react";

/**
 * The top left corner.
 *
 * From the Figma inspect panel, as drawn there: the paths are Figma's, and
 * only the colour is changed, from the panel's white to `currentColor`, so
 * it follows whatever text colour its parent sets. Filled rather than
 * stroked. Its box is 24 by 24; it takes a size from its caller
 * like any other.
 */
export function CornerTopLeftIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M15.5 8C15.6326 8 15.7598 8.05268 15.8536 8.14645C15.9473 8.24021 16 8.36739 16 8.5C16 8.63261 15.9473 8.75979 15.8536 8.85355C15.7598 8.94732 15.6326 9 15.5 9H12.5C11.792 9 11.29 9 10.898 9.032C10.513 9.064 10.277 9.123 10.092 9.218C9.71569 9.40974 9.40974 9.71569 9.218 10.092C9.123 10.277 9.064 10.512 9.032 10.898C9 11.29 9 11.792 9 12.5V15.5C9 15.6326 8.94732 15.7598 8.85355 15.8536C8.75979 15.9473 8.63261 16 8.5 16C8.36739 16 8.24021 15.9473 8.14645 15.8536C8.05268 15.7598 8 15.6326 8 15.5V12.5C8 11.808 8 11.26 8.036 10.817C8.073 10.37 8.149 9.987 8.327 9.637C8.61452 9.07306 9.07306 8.61452 9.637 8.327C9.987 8.149 10.37 8.073 10.817 8.037C11.26 8 11.808 8 12.5 8H15.5Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        fillOpacity="0.698"
      />
    </svg>
  );
}
