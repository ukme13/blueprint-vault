import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { applySavedColourModeScript } from "./theme-mode";
import { ThemeProvider } from "./theme-provider";

import { Geist_Mono, Inter, Noto_Sans_Thai } from "next/font/google";

/*
 * The studio's own typeface, which is not the client's.
 *
 * Whatever a workspace's type scale says belongs to the person using this
 * tool; these three are the tool's chrome, the same way theme.css holds the
 * chrome's colours. The typography studio's previews and every export read the
 * workspace instead, and `typography-studio-font.spec.ts` holds that line.
 *
 * Two families and one role. next/font gives each family its own variable —
 * there is no option that folds two into one, and `fallback` takes plain
 * family names rather than another loader — so the join is a CSS font stack,
 * composed once in theme.css. Inter carries Latin, Noto Sans Thai carries the
 * Thai block Inter has no glyphs for, and the browser falls from one to the
 * other per character, which is what a font stack has always done.
 *
 * All three are variable fonts, so no weight is declared: `weight` is only
 * required for a family that has none.
 */
const sansLatin = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-latin",
});
const sansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  display: "swap",
  variable: "--font-sans-thai",
});
/* Geist Mono stays, now from Google rather than a file in the repo. Keeping
   the face means any change this branch makes to how the apps look is
   attributable to the sans alone, and loading it the same way as the other
   two leaves one mechanism and no font binaries to carry. */
const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-face",
});

const fontVariables = [sansLatin, sansThai, mono]
  .map((font) => font.variable)
  .join(" ");

export const metadata: Metadata = {
  title: {
    default: "Blueprint Documentation",
    template: "%s | Blueprint",
  },
  description:
    "Documentation for Blueprint design tokens, shared components, and application patterns.",
};

/**
 * Apply the saved mode before the first paint.
 *
 * The same script the studio inlines, from @blueprint/ui, reading the same
 * key. Without it the page paints in the system's scheme and snaps to the
 * saved mode a frame later, once the provider has read storage.
 */
const APPLY_SAVED_MODE = applySavedColourModeScript();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* No data-theme here any more. It pinned the documentation light, on a
       site describing a system whose every name carries two values.

       suppressHydrationWarning because of the script below: it writes
       data-theme before React hydrates, so the client's <html> carries an
       attribute the server's did not, and React reports the difference as an
       error. It is the intended difference, and the suppression reaches this
       element only. */
    <html className={fontVariables} lang="en" suppressHydrationWarning>
      <body>
        <Script id="apply-saved-theme" strategy="beforeInteractive">
          {APPLY_SAVED_MODE}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
