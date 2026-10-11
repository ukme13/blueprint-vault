"use client";

import { useCallback, useRef, useState } from "react";
import {
  bindLayoutSlot,
  defaultLayoutTokens,
  defaultPreviewDevices,
  defaultSpacingScale,
  resolvePreviewDevice,
  seedPreviewSections,
  seedTypographyProject,
  setLayoutReference,
  useWorkspaceStore,
  withLayoutTokens,
  type LayoutBindings,
  type PreviewStyles,
} from "@blueprint/ui";
import { useIsPhone } from "../use-is-phone";
import { useThemeMode } from "../../app/theme-provider";
import { PreviewInspectPanel } from "../inspect/PreviewInspectPanel";
import { PreviewSelectionBox } from "../inspect/PreviewSelectionBox";
import { usePreviewInspector } from "../inspect/use-preview-inspector";
import { Sheet } from "../Sheet";
import { PreviewStylesProvider } from "./preview-styles-context";
import { PreviewChrome } from "../PreviewChrome";
import { usePaletteView } from "../palette/PaletteViewContext";
import { useGoogleFontsLink } from "../typography/use-google-fonts";
import { useLocalFonts } from "../typography/use-local-fonts";
import { PreviewSite } from "./PreviewSite";
import { SpacingOverlay } from "../spacing-overlay/SpacingOverlay";
import { usePreviewScales } from "./use-preview-scales";

const EMPTY_TOKENS: never[] = [];
const EMPTY_STYLES: PreviewStyles = {};

/**
 * The whole system on one page, as a landing site.
 *
 * Every colour here comes from a semantic token and nothing else. Type and
 * layout come from the same names the handover file emits. Click a slot to
 * change copy, role, or token colour; the ⋯ on a band sets fill. The scale
 * is not edited here. The article judged in Typography stays on
 * `previewDocument`.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

export function SystemPreview() {
  const { seen } = usePaletteView();
  const { project, hasLoaded, update } = useWorkspaceStore();
  const { resolved: mode } = useThemeMode();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [deviceId, setDeviceId] = useState("desktop");
  /* The spacing overlay: a way of looking, so not saved and not undone. */
  const [showSpacing, setShowSpacing] = useState(false);
  /* Which use each space on the page reads, where it is not its own. Like
     the overlay it belongs to, a way of looking: not saved, not undone, and
     the Uses table is not touched by it. */
  const [layoutBindings, setLayoutBindings] = useState<LayoutBindings>({});

  const tokens = project?.semantics ?? EMPTY_TOKENS;
  const typography =
    project?.typography ?? seedTypographyProject(project?.name ?? "Workspace");
  const system = typography.system;
  const sections = typography.previewSections ?? seedPreviewSections();
  const devices =
    project?.previewDevices ?? defaultPreviewDevices(system.ratio);
  /* A phone previews as a phone. The device bar is hidden there, so the
     choice made on a wider screen is kept for when it is wide again. */
  const isPhone = useIsPhone();
  const frame = resolvePreviewDevice(isPhone ? "phone" : deviceId, devices);

  useGoogleFontsLink(system, undefined, 400);
  useLocalFonts(system);

  const scales = usePreviewScales({
    project,
    tokens,
    mode,
    seen,
    frame,
    devices,
    system,
    unit: typography.unit,
    remRootPx: typography.remRootPx,
    layoutBindings,
  });
  const previewStyles = typography.previewStyles ?? EMPTY_STYLES;
  const inspector = usePreviewInspector({
    update,
    system,
    previewLanding: typography.previewLanding,
    previewShell: typography.previewShell,
    previewStyles,
    sections,
    tokens,
    scales,
    setLayoutBindings,
  });
  const { inspecting, clearSelection } = inspector;

  const onDeviceChange = useCallback(
    (id: string) => {
      /* Close the inspector first: its <dialog> is on the top layer, and the
         canvas remounts when the overflow ancestor changes. Unmounting that
         node while it is still open throws removeChild on null. The timeout
         lets Dialog's close() effect run; an rAF can fire before that effect. */
      clearSelection();
      window.setTimeout(() => setDeviceId(id), 0);
    },
    [clearSelection],
  );

  if (!hasLoaded) {
    return <div aria-busy="true" className="h-full min-h-0" />;
  }

  if (tokens.length === 0) {
    return (
      <div
        className="mx-auto max-w-2xl"
        style={{
          paddingInline: "var(--spacing-6)",
          paddingBlock: "var(--spacing-16)",
        }}
      >
        <h1 className="text-xl font-semibold">Nothing to preview yet</h1>
        <p
          className="text-sm"
          style={{
            color: "var(--color-fg-secondary)",
            marginTop: "var(--spacing-2)",
          }}
        >
          This page is drawn entirely from the semantic layer. Build a palette,
          then open the Semantics tab to see it here.
        </p>
      </div>
    );
  }

  return (
    <PreviewChrome
      canvas={
        <PreviewStylesProvider styles={previewStyles} tokens={tokens}>
          <PreviewSite
            key={frame.kind === "desktop" ? "desktop" : "framed"}
            canvasRef={canvasRef}
            frameId={frame.id}
            landing={typography.previewLanding}
            ready={tokens.length > 0}
            sections={sections}
            shell={typography.previewShell}
            system={system}
            variables={scales.variables}
            onInspectLanding={(id) =>
              inspector.select({ source: "landing", id })
            }
            onInspectSection={(id) =>
              inspector.select({ source: "section", id })
            }
            onInspectShell={(id) => inspector.select({ source: "shell", id })}
            onSectionFill={inspector.patchSectionFill}
          >
            {showSpacing ? (
              <SpacingOverlay
                deviceId={frame.id}
                deviceName={frame.name}
                bindings={layoutBindings}
                layout={project?.layout ?? defaultLayoutTokens()}
                spacing={project?.spacing ?? defaultSpacingScale()}
                onBindSlot={(slot, tokenId) =>
                  setLayoutBindings((current) =>
                    bindLayoutSlot(current, slot, tokenId),
                  )
                }
                onRebindStep={(tokenId, step) =>
                  update(
                    (current) =>
                      withLayoutTokens(
                        current,
                        setLayoutReference(
                          current?.layout ?? defaultLayoutTokens(),
                          tokenId,
                          frame.id,
                          step,
                        ),
                      ),
                    /* Made on this page, whatever it changed: an undo returns here. */
                    { origin: { path: "/preview" } },
                  )
                }
              />
            ) : null}
            {inspecting ? (
              <PreviewSelectionBox
                canvasRef={canvasRef}
                id={inspecting.id}
                isBand={inspecting.source === "section"}
              />
            ) : null}
          </PreviewSite>
        </PreviewStylesProvider>
      }
      device={frame}
      devices={devices}
      inspector={
        isPhone ? undefined : <PreviewInspectPanel {...inspector.panelProps} />
      }
      isInspectorOpen={inspector.isInspectorOpen}
      onInspectorOpenChange={inspector.setIsInspectorOpen}
      mode={mode}
      onDeviceChange={onDeviceChange}
      showSpacing={showSpacing}
      onResetToDefault={inspector.resetAllToDefault}
      onShowSpacingChange={setShowSpacing}
    >
      {isPhone ? (
        <Sheet
          isOpen={inspecting !== null}
          label="Inspect"
          padding="flush"
          onClose={clearSelection}
        >
          <PreviewInspectPanel {...inspector.panelProps} isInSheet />
        </Sheet>
      ) : null}
    </PreviewChrome>
  );
}
