import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeControl } from "../../../components/ThemeControl";

export const metadata: Metadata = {
  title: "Button",
  description:
    "Blueprint Button usage, interactive examples, variants, sizes, and API reference.",
};

/**
 * The Button page, with the mode control the rest of the documentation has.
 *
 * The page below it is written in fixed Tailwind utilities and does not follow
 * the mode — it predates the semantic layer and stage 4's scanner is what will
 * find it. The Buttons on it do follow, which is the thing worth being able to
 * check: six schemes by six variants, both modes, on one screen.
 */
export default function ButtonDocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <div className="flex justify-end px-6 pt-6">
        <ThemeControl />
      </div>
      {children}
    </>
  );
}
