import type { SVGProps } from "react";

/**
 * The bottom left corner.
 *
 * From the Figma inspect panel, as drawn there: the paths are Figma's, and
 * only the colour is changed, from the panel's white to `currentColor`, so
 * it follows whatever text colour its parent sets. Filled rather than
 * stroked. Its box is 24 by 24; it takes a size from its caller
 * like any other.
 */
export function CornerBottomLeftIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M8.5 8C8.63261 8 8.75979 8.05268 8.85355 8.14645C8.94732 8.24021 9 8.36739 9 8.5V11.5C9 12.208 9 12.71 9.032 13.102C9.064 13.487 9.123 13.723 9.218 13.908C9.40974 14.2843 9.71569 14.5903 10.092 14.782C10.277 14.877 10.512 14.936 10.898 14.968C11.29 15 11.792 15 12.5 15H15.5C15.6326 15 15.7598 15.0527 15.8536 15.1464C15.9473 15.2402 16 15.3674 16 15.5C16 15.6326 15.9473 15.7598 15.8536 15.8536C15.7598 15.9473 15.6326 16 15.5 16H12.5C11.808 16 11.26 16 10.817 15.964C10.37 15.927 9.987 15.851 9.637 15.673C9.07306 15.3855 8.61452 14.9269 8.327 14.363C8.149 14.013 8.073 13.63 8.037 13.183C8 12.74 8 12.192 8 11.5V8.5C8 8.36739 8.05268 8.24021 8.14645 8.14645C8.24021 8.05268 8.36739 8 8.5 8Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        fillOpacity="0.698"
      />
    </svg>
  );
}
