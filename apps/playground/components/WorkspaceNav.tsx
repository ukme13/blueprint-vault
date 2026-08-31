"use client";

import Link from "next/link";

interface WorkspaceNavProps {
  active: "colour" | "typography" | "preview";
}

export function WorkspaceNav({ active }: WorkspaceNavProps) {
  return (
    <nav aria-label="Blueprint workspaces">
      <Link aria-current={active === "colour" ? "page" : undefined} href="/">
        Colour
      </Link>
      <Link
        aria-current={active === "typography" ? "page" : undefined}
        href="/typography"
      >
        Typography
      </Link>
      <Link
        aria-current={active === "preview" ? "page" : undefined}
        href="/preview"
      >
        Preview
      </Link>
    </nav>
  );
}
