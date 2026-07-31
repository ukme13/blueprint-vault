import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Button",
  description:
    "Blueprint Button usage, interactive examples, variants, sizes, and API reference.",
};

export default function ButtonDocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
