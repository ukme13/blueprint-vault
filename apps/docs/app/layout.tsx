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
