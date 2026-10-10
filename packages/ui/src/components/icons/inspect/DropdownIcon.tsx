import type { SVGProps } from "react";

/**
 * A dropdown's chevron, in the 23 by 24 box Figma draws it in.
 *
 * From the Figma inspect panel, as drawn there: the paths are Figma's, and
 * only the colour is changed, from the panel's white to `currentColor`, so
 * it follows whatever text colour its parent sets. Filled rather than
 * stroked. Its box is 23 by 24; it takes a size from its caller
 * like any other.
 */
export function DropdownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      viewBox="0 0 23 24"
      width="23"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8.76492 11.1816C8.80943 11.137 8.8623 11.1016 8.92052 11.0774C8.97873 11.0532 9.04114 11.0408 9.10417 11.0408C9.16719 11.0408 9.2296 11.0532 9.28782 11.0774C9.34603 11.1016 9.39891 11.137 9.44342 11.1816L11.0208 12.76L12.5982 11.1816C12.6882 11.0916 12.8103 11.0411 12.9375 11.0411C13.0647 11.0411 13.1868 11.0916 13.2768 11.1816C13.3667 11.2716 13.4173 11.3936 13.4173 11.5208C13.4173 11.6481 13.3667 11.7701 13.2768 11.8601L11.3601 13.7768C11.3156 13.8214 11.2627 13.8568 11.2045 13.8809C11.1463 13.9051 11.0839 13.9175 11.0208 13.9175C10.9578 13.9175 10.8954 13.9051 10.8372 13.8809C10.779 13.8568 10.7261 13.8214 10.6816 13.7768L8.76492 11.8601C8.72029 11.8156 8.68489 11.7627 8.66073 11.7045C8.63658 11.6463 8.62414 11.5839 8.62414 11.5208C8.62414 11.4578 8.63658 11.3954 8.66073 11.3372C8.68489 11.279 8.72029 11.2261 8.76492 11.1816Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
      />
    </svg>
  );
}
