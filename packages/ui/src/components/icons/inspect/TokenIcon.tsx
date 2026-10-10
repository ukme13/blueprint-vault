import type { SVGProps } from "react";

/**
 * A value bound to a token, in the 12 box Figma draws it in.
 *
 * From the Figma inspect panel, as drawn there: the paths are Figma's, and
 * only the colour is changed, from the panel's white to `currentColor`, so
 * it follows whatever text colour its parent sets. Filled rather than
 * stroked. Its box is 12 by 12; it takes a size from its caller
 * like any other.
 */
export function TokenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="12"
      viewBox="0 0 12 12"
      width="12"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10.5 8V4C10.4998 3.82464 10.4535 3.65241 10.3658 3.50058C10.278 3.34876 10.1519 3.22268 10 3.135L6.5 1.135C6.34798 1.04723 6.17554 1.00103 6 1.00103C5.82446 1.00103 5.65202 1.04723 5.5 1.135L2 3.135C1.84813 3.22268 1.72199 3.34876 1.63423 3.50058C1.54647 3.65241 1.50018 3.82464 1.5 4V8C1.50018 8.17536 1.54647 8.3476 1.63423 8.49942C1.72199 8.65124 1.84813 8.77732 2 8.865L5.5 10.865C5.65202 10.9528 5.82446 10.999 6 10.999C6.17554 10.999 6.34798 10.9528 6.5 10.865L10 8.865C10.1519 8.77732 10.278 8.65124 10.3658 8.49942C10.4535 8.3476 10.4998 8.17536 10.5 8Z"
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      />
      <path
        d="M6 7.25C6.69036 7.25 7.25 6.69036 7.25 6C7.25 5.30964 6.69036 4.75 6 4.75C5.30964 4.75 4.75 5.30964 4.75 6C4.75 6.69036 5.30964 7.25 6 7.25Z"
        fill="currentColor"
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      />
    </svg>
  );
}
