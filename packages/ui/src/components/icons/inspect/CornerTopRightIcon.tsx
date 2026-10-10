import type { SVGProps } from "react";

/**
 * The top right corner.
 *
 * From the Figma inspect panel, as drawn there: the paths are Figma's, and
 * only the colour is changed, from the panel's white to `currentColor`, so
 * it follows whatever text colour its parent sets. Filled rather than
 * stroked. Its box is 24 by 24; it takes a size from its caller
 * like any other.
 */
export function CornerTopRightIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M11.5 8C12.192 8 12.74 8 13.183 8.036C13.63 8.073 14.013 8.149 14.363 8.327C14.9269 8.61452 15.3855 9.07306 15.673 9.637C15.851 9.987 15.927 10.37 15.963 10.817C16 11.259 16 11.808 16 12.5V15.5C16 15.6326 15.9473 15.7598 15.8536 15.8536C15.7598 15.9473 15.6326 16 15.5 16C15.3674 16 15.2402 15.9473 15.1464 15.8536C15.0527 15.7598 15 15.6326 15 15.5V12.5C15 11.792 15 11.29 14.968 10.898C14.936 10.513 14.877 10.277 14.782 10.092C14.5903 9.71569 14.2843 9.40974 13.908 9.218C13.723 9.123 13.488 9.064 13.102 9.032C12.71 9 12.208 9 11.5 9H8.5C8.36739 9 8.24021 8.94732 8.14645 8.85355C8.05268 8.75979 8 8.63261 8 8.5C8 8.36739 8.05268 8.24021 8.14645 8.14645C8.24021 8.05268 8.36739 8 8.5 8H11.5Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        fillOpacity="0.698"
      />
    </svg>
  );
}
