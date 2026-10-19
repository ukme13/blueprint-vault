"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ExportReply, ExportRequest } from "./export-worker";
import {
  exportHandoverFiles,
  exportOutput,
  isHeavyExport,
  type ExportFormat,
  type ExportInput,
  type HandoverFiles,
} from "./system-export-download";

const NO_FILES: HandoverFiles = [];

interface Computed {
  input: ExportInput;
  output: string;
  handover: HandoverFiles;
}

interface Job {
  format: ExportFormat;
  input: ExportInput;
}

/* A job and a result are both a format made from an input. */
type Made = Pick<Computed, "input">;

/** Whether a result was made from what the dialog now holds. */
function isCurrent(computed: Made, input: ExportInput): boolean {
  return (
    computed.input.workspace === input.workspace &&
    computed.input.palettes === input.palettes &&
    computed.input.colourFormat === input.colourFormat &&
    computed.input.unit === input.unit &&
    computed.input.remRootPx === input.remRootPx
  );
}

/**
 * The text of the chosen export, and the handover archive's files when that is
 * the one chosen.
 *
 * The plain formats are a pass over the tokens and are made as the dialog
 * renders. The handover archive and the accessibility reports measure every
 * pair of shades and write the result out, and they are made only when chosen,
 * in a worker, so the page goes on answering (the dialog closed, another format
 * chosen) while one is on its way. Where a worker cannot be had, or fails, they
 * are made on the page a tick after its loading state has painted, which is
 * slower to answer but the same file. A result is kept per format, so going
 * back to one is not a second wait.
 *
 * Nothing is made while the dialog is closed.
 */
export function useExportOutput(
  format: ExportFormat,
  input: ExportInput,
  isEnabled: boolean,
): { output: string; handover: HandoverFiles; isPending: boolean } {
  const isHeavy = isHeavyExport(format);
  const { workspace, palettes, colourFormat, unit, remRootPx } = input;

  const light = useMemo(
    () =>
      isEnabled && !isHeavy
        ? exportOutput(
            format,
            { workspace, palettes, colourFormat, unit, remRootPx },
            NO_FILES,
          )
        : "",
    [
      colourFormat,
      format,
      isEnabled,
      isHeavy,
      palettes,
      remRootPx,
      unit,
      workspace,
    ],
  );

  const [computed, setComputed] = useState<
    Partial<Record<ExportFormat, Computed>>
  >({});
  const own = computed[format];
  const isFresh = own !== undefined && isCurrent(own, input);

  const store = useCallback(
    (job: Job, output: string, handover: HandoverFiles) =>
      startTransition(() =>
        setComputed((previous) => ({
          ...previous,
          [job.format]: { input: job.input, output, handover },
        })),
      ),
    [],
  );

  /* On the page, after the loading state has painted. */
  const makeHere = useCallback(
    (job: Job) =>
      window.setTimeout(() => {
        const handover =
          job.format === "handover" ? exportHandoverFiles(job.input) : NO_FILES;
        store(job, exportOutput(job.format, job.input, handover), handover);
      }, 0),
    [store],
  );

  const workerRef = useRef<Worker | null>(null);
  const jobs = useRef(new Map<number, Job>());
  const nextId = useRef(0);
  const timers = useRef(new Set<number>());

  const makeHereTracked = useCallback(
    (job: Job) => {
      const timer = makeHere(job);
      timers.current.add(timer);
    },
    [makeHere],
  );

  /* The worker lives while the dialog is open. */
  useEffect(() => {
    if (!isEnabled) return;
    const pendingJobs = jobs.current;
    const pendingTimers = timers.current;
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pendingJobs.clear();
      pendingTimers.forEach((timer) => window.clearTimeout(timer));
      pendingTimers.clear();
    };
  }, [isEnabled]);

  const workerFor = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === "undefined") return null;
    try {
      const worker = new Worker(new URL("./export-worker.ts", import.meta.url));
      worker.onmessage = (event: MessageEvent<ExportReply>) => {
        const job = jobs.current.get(event.data.id);
        jobs.current.delete(event.data.id);
        if (!job) return;
        if ("error" in event.data) makeHereTracked(job);
        else store(job, event.data.output, event.data.handover);
      };
      /* A worker that cannot start: what it was asked is made here instead. */
      worker.onerror = () => {
        const waiting = [...jobs.current.values()];
        jobs.current.clear();
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        waiting.forEach(makeHereTracked);
      };
      workerRef.current = worker;
      return worker;
    } catch {
      return null;
    }
  }, [makeHereTracked, store]);

  useEffect(() => {
    if (!isEnabled || !isHeavy || isFresh) return;
    const job: Job = {
      format,
      input: { workspace, palettes, colourFormat, unit, remRootPx },
    };
    /* Already on its way for this very input: wait for it. */
    for (const waiting of jobs.current.values()) {
      if (waiting.format === format && isCurrent(waiting, job.input)) return;
    }
    const worker = workerFor();
    if (!worker) {
      const timer = makeHere(job);
      return () => window.clearTimeout(timer);
    }
    const id = (nextId.current += 1);
    jobs.current.set(id, job);
    const request: ExportRequest = {
      id,
      format,
      workspace,
      colourFormat,
      unit,
      remRootPx,
    };
    try {
      worker.postMessage(request);
    } catch {
      /* A project that cannot be copied across is made here. */
      jobs.current.delete(id);
      const timer = makeHere(job);
      return () => window.clearTimeout(timer);
    }
  }, [
    colourFormat,
    format,
    isEnabled,
    isFresh,
    isHeavy,
    makeHere,
    palettes,
    remRootPx,
    unit,
    workerFor,
    workspace,
  ]);

  if (!isHeavy) return { output: light, handover: NO_FILES, isPending: false };
  return {
    output: isFresh ? own.output : "",
    handover: isFresh ? own.handover : NO_FILES,
    isPending: isEnabled && !isFresh,
  };
}
