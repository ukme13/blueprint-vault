import type { SVGProps } from "react";

/**
 * The bottom right corner.
 *
 * From the Figma inspect panel, as drawn there: the paths are Figma's, and
 * only the colour is changed, from the panel's white to `currentColor`, so
 * it follows whatever text colour its parent sets. Filled rather than
 * stroked. Its box is 24 by 24; it takes a size from its caller
 * like any other.
 */
export function CornerBottomRightIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M15.5 8C15.6326 8 15.7598 8.05268 15.8536 8.14645C15.9473 8.24021 16 8.36739 16 8.5V11.5C16 12.192 16 12.74 15.964 13.183C15.927 13.63 15.851 14.013 15.673 14.363C15.3855 14.9269 14.9269 15.3855 14.363 15.673C14.013 15.851 13.63 15.927 13.183 15.963C12.74 16 12.192 16 11.5 16H8.5C8.36739 16 8.24021 15.9473 8.14645 15.8536C8.05268 15.7598 8 15.6326 8 15.5C8 15.3674 8.05268 15.2402 8.14645 15.1464C8.24021 15.0527 8.36739 15 8.5 15H11.5C12.208 15 12.71 15 13.102 14.968C13.487 14.936 13.723 14.877 13.908 14.782C14.2843 14.5903 14.5903 14.2843 14.782 13.908C14.877 13.723 14.936 13.488 14.968 13.102C15 12.71 15 12.208 15 11.5V8.5C15 8.36739 15.0527 8.24021 15.1464 8.14645C15.2402 8.05268 15.3674 8 15.5 8Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        fillOpacity="0.698"
      />
    </svg>
  );
}
