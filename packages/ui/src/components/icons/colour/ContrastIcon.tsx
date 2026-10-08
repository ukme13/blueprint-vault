import type { SVGProps } from "react";

/**
 * Contrast: a circle with its right half filled.
 *
 * Drawn on an 11 unit grid, so its box is 11 by 11 and not the 24 the other
 * icons use; it takes a size from its caller (`className="size-3.5"`) like any
 * other. Filled rather than stroked, in `currentColor`, so it follows whatever
 * text colour its parent sets.
 */
export function ContrastIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="11"
      viewBox="0 0 11 11"
      width="11"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9.625 5.5C9.625 3.22266 7.77734 1.375 5.5 1.375V9.625C7.77734 9.625 9.625 7.77734 9.625 5.5ZM0 5.5C0 2.4707 2.4707 0 5.5 0C8.5293 0 11 2.4707 11 5.5C11 8.5293 8.5293 11 5.5 11C2.4707 11 0 8.5293 0 5.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
