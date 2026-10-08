"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

/* The EyeDropper API is Chromium's, and not in every TypeScript's DOM types,
   so what is used of it is written out here. */
interface EyeDropperResult {
  sRGBHex: string;
}
interface EyeDropperInstance {
  open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResult>;
}
type EyeDropperConstructor = new () => EyeDropperInstance;

const constructorOf = (): EyeDropperConstructor | undefined =>
  (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper;

const noSubscription = () => () => {};
const supported = () => constructorOf() !== undefined;
const unsupported = () => false;

/**
 * Sampling a colour from anywhere on screen, where the browser can.
 *
 * `isSupported` is false on the server and on the first render, and settles
 * once the page is in the browser, so a button gated on it is never in the
 * server's markup and cannot disagree with it. `sample` opens the browser's
 * own magnifier; the colour under the click goes to `onSample`. Pressing
 * Escape to give up is the browser rejecting, and is not a failure to report.
 */
export function useEyeDropper(onSample: (hex: string) => void) {
  const isSupported = useSyncExternalStore(
    noSubscription,
    supported,
    unsupported,
  );
  const [isSampling, setIsSampling] = useState(false);

  const sample = useCallback(async () => {
    const EyeDropper = constructorOf();
    if (!EyeDropper) return;
    setIsSampling(true);
    try {
      const { sRGBHex } = await new EyeDropper().open();
      onSample(sRGBHex);
    } catch {
      /* Dismissed, or the browser would not open it: nothing was picked. */
    } finally {
      setIsSampling(false);
    }
  }, [onSample]);

  return { isSupported, isSampling, sample };
}
