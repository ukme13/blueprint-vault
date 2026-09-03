"use client";

import { useEffect, useState } from "react";
import { Slider } from "@astryxdesign/core/Slider";
import {
  Button,
  MAX_SPACING_BASE_UNIT_PX,
  MIN_SPACING_BASE_UNIT_PX,
  defaultElevationScale,
  defaultRadiusScale,
  defaultSpacingScale,
  generateSpacingSteps,
  resolveSpacing,
  spacingStepName,
  generatePalettes,
  browserWorkspaceStorage,
  emptyWorkspace,
  loadStoredWorkspace,
  updateStoredWorkspace,
  withElevationSlice,
  withRadiusSlice,
  withSharedName,
  withSpacingSlice,
  type ElevationScale,
  type RadiusScale,
  type ColorTrack,
  type SpacingScale,
  type WorkspaceProject,
} from "@blueprint/ui";
import { ElevationEditor } from "./ElevationEditor";
import { SystemExportDialog } from "../SystemExportDialog";
import { WorkspaceBrand } from "../WorkspaceBrand";
import { RadiusEditor } from "./RadiusEditor";
import { StudioThemeControl } from "../StudioThemeControl";
import { WorkspaceNav } from "../WorkspaceNav";

/**
 * Edit the spacing scale: a base unit, and which multiples of it ship.
 *
 * The steps are offered as a ramp to prune rather than a list to type. That is
 * the shape the plan settled on: a formula alone gives 6.25px, and a blank list
 * is a tedious place to start from.
 *
 * See docs/roadmap/scale-studio.md.
 */

function readStoredWorkspace(): WorkspaceProject | null {
  return loadStoredWorkspace(browserWorkspaceStorage());
}

/**
 * Persist one slice, and only that slice.
 *
 * The stored workspace is re-read for the reason the other studios re-read it:
 * another tab may have moved on since this page loaded, and writing the copy we
 * hold would take its work with us. `updateStoredWorkspace` is where that read
 * now happens.
 */
function writeStoredSpacing(spacing: SpacingScale): void {
  updateStoredWorkspace(browserWorkspaceStorage(), (current) =>
    withSpacingSlice(current, spacing),
  );
}

function writeStoredRadius(radius: RadiusScale): void {
  updateStoredWorkspace(browserWorkspaceStorage(), (current) =>
    withRadiusSlice(current, radius),
  );
}

function writeStoredElevation(elevation: ElevationScale): void {
  updateStoredWorkspace(browserWorkspaceStorage(), (current) =>
    withElevationSlice(current, elevation),
  );
}

/**
 * Rename the workspace.
 *
 * Through withSharedName, because the name lives on the workspace and the
 * typography slice keeps its own copy for the things that read it — the type
 * export and the accessibility report. Writing only the top-level one leaves
 * storage disagreeing with itself.
 */
function writeStoredName(name: string): void {
  updateStoredWorkspace(browserWorkspaceStorage(), (stored) => {
    const current = stored ?? emptyWorkspace();
    return withSharedName({ ...current, name: name.trim() || current.name });
  });
}

/** Every step the ramp offers, whether or not this scale keeps it. */
const OFFERED_STEPS = generateSpacingSteps(16);

export function SpacingStudio() {
  const [scale, setScale] = useState<SpacingScale>(defaultSpacingScale());
  const [radius, setRadius] = useState<RadiusScale>(defaultRadiusScale());
  const [elevation, setElevation] = useState<ElevationScale>(
    defaultElevationScale(),
  );
  /* The shadow colour is drawn from the palette, so the levels need it. */
  const [palettes, setPalettes] = useState<ColorTrack[]>([]);
  const [name, setName] = useState("Workspace");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceProject | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    /* In an effect, not a state initializer: localStorage does not exist during
       SSR and reading it there desyncs hydration. */
    const project = readStoredWorkspace();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScale(project?.spacing ?? defaultSpacingScale());
    setRadius(project?.radius ?? defaultRadiusScale());
    setElevation(project?.elevation ?? defaultElevationScale());
    setPalettes(project?.palette ? generatePalettes(project.palette) : []);
    setName(project?.name ?? "Workspace");
    setWorkspace(project);
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    writeStoredSpacing(scale);
  }, [hasLoaded, scale]);

  useEffect(() => {
    if (!hasLoaded) return;
    writeStoredRadius(radius);
  }, [hasLoaded, radius]);

  useEffect(() => {
    if (!hasLoaded) return;
    writeStoredElevation(elevation);
  }, [elevation, hasLoaded]);

  const tokens = resolveSpacing(scale);
  const kept = new Set(scale.steps);

  const toggleStep = (step: number) =>
    setScale((current) => ({
      ...current,
      steps: kept.has(step)
        ? current.steps.filter((each) => each !== step)
        : [...current.steps, step].sort((first, second) => first - second),
    }));

  return (
    <div className="min-h-dvh">
      <header className="flex flex-wrap items-center gap-3 border-b border-border-default bg-surface-subtle px-6 py-3">
        <WorkspaceBrand
          name={name}
          onChange={setName}
          onCommit={() => writeStoredName(name)}
        />
        <span className="ml-auto flex items-center gap-3">
          <StudioThemeControl />
          <WorkspaceNav active="scale" />
          <Button
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => setIsExportOpen(true)}
          >
            Export
          </Button>
        </span>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
        <section aria-label="Base unit" className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold">Spacing</h1>
          <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
            Every step is a multiple of the base unit. This is a grid rather
            than a ratio: a type scale multiplies, and spacing counts.
          </p>
          <div className="max-w-sm">
            <Slider
              label={`Base unit: ${scale.baseUnitPx}px`}
              max={MAX_SPACING_BASE_UNIT_PX}
              min={MIN_SPACING_BASE_UNIT_PX}
              step={1}
              value={scale.baseUnitPx}
              onChange={(value: number | [number, number]) =>
                setScale((current) => ({
                  ...current,
                  baseUnitPx: value as number,
                }))
              }
            />
          </div>
        </section>

        <section aria-label="Steps" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Steps</h2>
          <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
            The ramp, pruned. Turn off the steps this system does not need — two
            sizes nobody can tell apart are worse than one.
          </p>
          <div className="flex flex-wrap gap-2">
            {OFFERED_STEPS.map((step) => (
              <Button
                key={step}
                aria-pressed={kept.has(step)}
                scheme="neutral"
                size="xs"
                variant={kept.has(step) ? "contained" : "outlined"}
                onClick={() => toggleStep(step)}
              >
                {spacingStepName(step)}
              </Button>
            ))}
          </div>
        </section>

        <section
          aria-label="Generated spacing steps"
          className="flex flex-col gap-2"
        >
          <h2 className="text-sm font-semibold">
            {tokens.length} token{tokens.length === 1 ? "" : "s"}
          </h2>
          <ol className="flex flex-col gap-1">
            {tokens.map((token) => (
              <li key={token.step} className="flex items-center gap-3 text-sm">
                <code className="w-32 shrink-0 text-xs text-[var(--color-text-secondary)]">
                  {token.variable}
                </code>
                <span className="w-16 shrink-0 tabular-nums">{token.px}px</span>
                <span className="w-20 shrink-0 tabular-nums text-[var(--color-text-secondary)]">
                  {token.rem}rem
                </span>
                {/* The bar is the point of the list: a scale is judged by
                    whether neighbouring steps look different, which a column
                    of numbers hides. */}
                <span
                  aria-hidden="true"
                  className="h-3 rounded-sm bg-action-primary"
                  style={{ width: `${token.px}px` }}
                />
              </li>
            ))}
          </ol>
        </section>

        <RadiusEditor scale={radius} onChange={setRadius} />

        <ElevationEditor
          palettes={palettes}
          scale={elevation}
          onChange={setElevation}
        />
      </main>

      {/* The same dialog Colour opens, carrying the whole system. Without an
          import handler it offers export only: importing replaces the entire
          workspace, which needs a confirmation this page does not own. */}
      <SystemExportDialog
        isOpen={isExportOpen}
        workspace={{
          ...(workspace ?? emptyWorkspace(name)),
          name,
          spacing: scale,
          radius,
          elevation,
        }}
        onOpenChange={setIsExportOpen}
      />
    </div>
  );
}
