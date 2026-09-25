"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import {
  PREVIEW_FOOTER_COLUMNS,
  PREVIEW_NAV_LINK_IDS,
  PREVIEW_SECTION_LABEL,
  previewSection,
  type PreviewDocument,
  type PreviewSection,
  type PreviewSectionFill,
  type PreviewSectionId,
  type TypeSystem,
} from "@blueprint/ui";
import { PreviewSectionBand } from "../PreviewSectionBand";
import type { PreviewImageError } from "../PreviewSectionMenu";
import { InspectableButton, InspectableSlot, slot } from "./Inspectable";
import { LandingCta } from "./LandingCta";
import {
  LandingFeatureCards,
  LandingQuadCards,
  LandingSplitA,
  LandingSplitB,
} from "./LandingFeatures";
import { LandingHero } from "./LandingHero";
import { LandingNewsletter } from "./LandingNewsletter";
import { LandingPricing } from "./LandingPricing";
import { LandingQuote } from "./LandingQuote";
import styles from "./landing.module.css";

const NAV_IDS = PREVIEW_NAV_LINK_IDS.filter((id) => id !== "shell-login");

function BrandLockup({
  shell,
  system,
  onInspect,
}: {
  shell: PreviewDocument;
  system: TypeSystem;
  onInspect: (id: string) => void;
}) {
  if (!slot(shell, "shell-brand")) return null;
  return (
    <div className={styles.brand}>
      <InspectableSlot
        as="p"
        document={shell}
        id="shell-brand"
        system={system}
        onInspect={onInspect}
      />
    </div>
  );
}

function Band({
  id,
  as,
  className,
  sections,
  workspaceId,
  children,
  onInspectSection,
  onSectionFill,
  onSectionError,
}: {
  id: PreviewSectionId;
  as?: "header" | "footer" | "div";
  className?: string;
  sections: readonly PreviewSection[];
  workspaceId: string | null;
  children: ReactNode;
  onInspectSection: (id: PreviewSectionId) => void;
  onSectionFill: (id: PreviewSectionId, fill: PreviewSectionFill) => void;
  onSectionError: (id: PreviewSectionId, error: PreviewImageError) => void;
}) {
  const fill = previewSection(sections, id)?.fill ?? {
    kind: "token" as const,
    tokenId: "surface.base",
  };
  return (
    <PreviewSectionBand
      as={as}
      className={className}
      fill={fill}
      label={PREVIEW_SECTION_LABEL[id]}
      sectionId={id}
      workspaceId={workspaceId}
      onError={(error) => onSectionError(id, error)}
      onFillChange={(next) => onSectionFill(id, next)}
      onPickColour={() => onInspectSection(id)}
    >
      {children}
    </PreviewSectionBand>
  );
}

export function PreviewSite({
  canvasRef,
  system,
  landing,
  shell,
  sections,
  workspaceId,
  variables,
  frameId,
  ready = false,
  onInspectLanding,
  onInspectShell,
  onInspectSection,
  onSectionFill,
  onSectionError,
}: {
  canvasRef: Ref<HTMLDivElement>;
  system: TypeSystem;
  landing: PreviewDocument;
  shell: PreviewDocument;
  sections: readonly PreviewSection[];
  workspaceId: string | null;
  variables: CSSProperties;
  frameId: string;
  ready?: boolean;
  onInspectLanding: (id: string) => void;
  onInspectShell: (id: string) => void;
  onInspectSection: (id: PreviewSectionId) => void;
  onSectionFill: (id: PreviewSectionId, fill: PreviewSectionFill) => void;
  onSectionError: (id: PreviewSectionId, error: PreviewImageError) => void;
}) {
  const landingProps = {
    landing,
    system,
    onInspect: onInspectLanding,
  };

  return (
    <div
      ref={canvasRef}
      className={styles.site}
      data-frame={frameId}
      data-preview-ready={ready ? "true" : undefined}
      style={variables}
    >
      <Band
        as="header"
        className={styles.nav}
        id="shell-nav"
        sections={sections}
        workspaceId={workspaceId}
        onInspectSection={onInspectSection}
        onSectionError={onSectionError}
        onSectionFill={onSectionFill}
      >
        <div className={styles.navInner}>
          <BrandLockup
            shell={shell}
            system={system}
            onInspect={onInspectShell}
          />
          <nav aria-label="Site" className={styles.navLinks}>
            {NAV_IDS.map((id) => (
              <InspectableSlot
                key={id}
                as="p"
                document={shell}
                id={id}
                system={system}
                onInspect={onInspectShell}
              />
            ))}
          </nav>
          <div className={styles.navCta}>
            <InspectableButton
              document={shell}
              system={system}
              id="shell-action"
              onInspect={onInspectShell}
            />
            <InspectableSlot
              as="p"
              className={styles.navLogin}
              document={shell}
              id="shell-login"
              system={system}
              onInspect={onInspectShell}
            />
          </div>
        </div>
      </Band>

      <main className={styles.main}>
        <Band
          id="landing-hero"
          sections={sections}
          workspaceId={workspaceId}
          onInspectSection={onInspectSection}
          onSectionError={onSectionError}
          onSectionFill={onSectionFill}
        >
          <LandingHero {...landingProps} />
        </Band>
        <Band
          id="landing-features"
          sections={sections}
          workspaceId={workspaceId}
          onInspectSection={onInspectSection}
          onSectionError={onSectionError}
          onSectionFill={onSectionFill}
        >
          <LandingFeatureCards {...landingProps} />
        </Band>
        <Band
          id="landing-split-a"
          sections={sections}
          workspaceId={workspaceId}
          onInspectSection={onInspectSection}
          onSectionError={onSectionError}
          onSectionFill={onSectionFill}
        >
          <LandingSplitA {...landingProps} />
        </Band>
        <Band
          id="landing-split-b"
          sections={sections}
          workspaceId={workspaceId}
          onInspectSection={onInspectSection}
          onSectionError={onSectionError}
          onSectionFill={onSectionFill}
        >
          <LandingSplitB {...landingProps} />
        </Band>
        <Band
          id="landing-quad"
          sections={sections}
          workspaceId={workspaceId}
          onInspectSection={onInspectSection}
          onSectionError={onSectionError}
          onSectionFill={onSectionFill}
        >
          <LandingQuadCards {...landingProps} />
        </Band>
        <Band
          id="landing-quote"
          sections={sections}
          workspaceId={workspaceId}
          onInspectSection={onInspectSection}
          onSectionError={onSectionError}
          onSectionFill={onSectionFill}
        >
          <LandingQuote {...landingProps} />
        </Band>
        <Band
          id="landing-pricing"
          sections={sections}
          workspaceId={workspaceId}
          onInspectSection={onInspectSection}
          onSectionError={onSectionError}
          onSectionFill={onSectionFill}
        >
          <LandingPricing {...landingProps} />
        </Band>
        <Band
          id="landing-cta"
          sections={sections}
          workspaceId={workspaceId}
          onInspectSection={onInspectSection}
          onSectionError={onSectionError}
          onSectionFill={onSectionFill}
        >
          <LandingCta {...landingProps} />
        </Band>
        <Band
          id="landing-newsletter"
          sections={sections}
          workspaceId={workspaceId}
          onInspectSection={onInspectSection}
          onSectionError={onSectionError}
          onSectionFill={onSectionFill}
        >
          <LandingNewsletter {...landingProps} />
        </Band>
      </main>

      <Band
        as="footer"
        className={styles.footer}
        id="shell-footer"
        sections={sections}
        workspaceId={workspaceId}
        onInspectSection={onInspectSection}
        onSectionError={onSectionError}
        onSectionFill={onSectionFill}
      >
        <div className={styles.wrap}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <BrandLockup
                shell={shell}
                system={system}
                onInspect={onInspectShell}
              />
              <InspectableSlot
                as="p"
                className={styles.small}
                document={shell}
                id="shell-footer"
                system={system}
                onInspect={onInspectShell}
              />
            </div>
            <div className={styles.footerLinks}>
              {PREVIEW_FOOTER_COLUMNS.map((column) => (
                <div className={styles.footerCol} key={column.headingId}>
                  <InspectableSlot
                    as="p"
                    className={styles.footerHead}
                    document={shell}
                    id={column.headingId}
                    system={system}
                    onInspect={onInspectShell}
                  />
                  <ul className={styles.footerList}>
                    {column.links
                      .filter((link) => slot(shell, link.id))
                      .map((link) => (
                        <li key={link.id}>
                          <InspectableSlot
                            as="p"
                            document={shell}
                            id={link.id}
                            system={system}
                            onInspect={onInspectShell}
                          />
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.footerBase}>
            <InspectableSlot
              as="p"
              className={styles.small}
              document={shell}
              id="shell-foot-copy"
              system={system}
              onInspect={onInspectShell}
            />
            <InspectableSlot
              as="p"
              className={styles.small}
              document={shell}
              id="shell-foot-credit"
              system={system}
              onInspect={onInspectShell}
            />
          </div>
        </div>
      </Band>
    </div>
  );
}
