import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { applySavedColourModeScript } from "./theme-mode";
import { ThemeProvider } from "./theme-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Blueprint Palette Playground",
    template: "%s | Blueprint",
  },
  description:
    "Experiment with Blueprint OKLCH palettes and preview design-system components.",
};

/**
 * Apply the saved mode before the first paint.
 *
 * `ThemeProvider` reads the choice after mount and Astryx's `Theme` then
 * writes `data-theme` onto `<html>` — correct, and a frame late. With no
 * attribute in the server HTML the page paints in the system's scheme, then
 * snaps to the saved one once React has run. This runs before any of that,
 * from the same storage key, so the first frame is already right. Inline
 * because it has to be: `beforeInteractive` is the one strategy that is
 * injected into the initial HTML ahead of hydration, and Next only allows it
 * in the root layout.
 *
 * The script itself comes from @blueprint/ui, because the documentation app
 * inlines the same one and two copies of a script that reads one key is two
 * things to keep in step.
 */
const APPLY_SAVED_MODE = applySavedColourModeScript();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* No data-theme here any more. It used to pin the studio dark whatever
       anybody chose; the mode is the provider's now, and the script below
       covers the frame before the provider exists.

       suppressHydrationWarning because of that script: it writes data-theme
       before React hydrates, so the client's <html> carries an attribute the
       server's did not, and React reports the difference as an error. It is
       the intended difference. The suppression reaches this element only —
       one level, by React's rule — so a mismatch anywhere below still
       surfaces. */
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Script id="apply-saved-theme" strategy="beforeInteractive">
          {APPLY_SAVED_MODE}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
