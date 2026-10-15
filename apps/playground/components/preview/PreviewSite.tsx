"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import {
  PREVIEW_FOOTER_COLUMNS,
  PREVIEW_NAV_LINK_IDS,
  PREVIEW_PAGE_ID,
  PREVIEW_SECTION_LABEL,
  previewSection,
  type PreviewDocument,
  type PreviewSection,
  type PreviewSectionFill,
  type PreviewSectionId,
  type TypeSystem,
} from "@blueprint/ui";
import { PreviewSectionBand } from "../PreviewSectionBand";
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
import { CardSurface } from "./CardSurface";
import { usePreviewSlotStyle } from "./preview-styles-context";
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
  children,
  onInspectSection,
  onSectionFill,
}: {
  id: PreviewSectionId;
  as?: "header" | "footer" | "div";
  className?: string;
  sections: readonly PreviewSection[];
  children: ReactNode;
  onInspectSection: (id: PreviewSectionId) => void;
  onSectionFill: (id: PreviewSectionId, fill: PreviewSectionFill) => void;
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
      isOpaque={id === "shell-nav"}
      sectionId={id}
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
  variables,
  frameId,
  ready = false,
  onInspectLanding,
  onInspectShell,
  onInspectSection,
  onSectionFill,
  children,
}: {
  canvasRef: Ref<HTMLDivElement>;
  system: TypeSystem;
  landing: PreviewDocument;
  shell: PreviewDocument;
  sections: readonly PreviewSection[];
  variables: CSSProperties;
  frameId: string;
  ready?: boolean;
  onInspectLanding: (id: string) => void;
  onInspectShell: (id: string) => void;
  onInspectSection: (id: PreviewSectionId) => void;
  onSectionFill: (id: PreviewSectionId, fill: PreviewSectionFill) => void;
  /** Laid over the page, inside it, so it scrolls with it: the overlay. */
  children?: ReactNode;
}) {
  /* The page's own colour, if one was chosen for it. */
  const pageStyle = usePreviewSlotStyle(PREVIEW_PAGE_ID);
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
      style={{ ...variables, ...pageStyle }}
    >
      <Band
        as="header"
        className={styles.nav}
        id="shell-nav"
        sections={sections}
        onInspectSection={onInspectSection}
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
          onInspectSection={onInspectSection}
          onSectionFill={onSectionFill}
        >
          <LandingHero {...landingProps} />
        </Band>
        <Band
          id="landing-features"
          sections={sections}
          onInspectSection={onInspectSection}
          onSectionFill={onSectionFill}
        >
          <LandingFeatureCards {...landingProps} />
        </Band>
        <Band
          id="landing-split-a"
          sections={sections}
          onInspectSection={onInspectSection}
          onSectionFill={onSectionFill}
        >
          <LandingSplitA {...landingProps} />
        </Band>
        <Band
          id="landing-split-b"
          sections={sections}
          onInspectSection={onInspectSection}
          onSectionFill={onSectionFill}
        >
          <LandingSplitB {...landingProps} />
        </Band>
        <Band
          id="landing-quad"
          sections={sections}
          onInspectSection={onInspectSection}
          onSectionFill={onSectionFill}
        >
          <LandingQuadCards {...landingProps} />
        </Band>
        <Band
          id="landing-quote"
          sections={sections}
          onInspectSection={onInspectSection}
          onSectionFill={onSectionFill}
        >
          <LandingQuote {...landingProps} />
        </Band>
        <Band
          id="landing-pricing"
          sections={sections}
          onInspectSection={onInspectSection}
          onSectionFill={onSectionFill}
        >
          <LandingPricing {...landingProps} />
        </Band>
        <Band
          id="landing-cta"
          sections={sections}
          onInspectSection={onInspectSection}
          onSectionFill={onSectionFill}
        >
          <LandingCta {...landingProps} />
        </Band>
        <Band
          id="landing-newsletter"
          sections={sections}
          onInspectSection={onInspectSection}
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
        onInspectSection={onInspectSection}
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
          <CardSurface
            as="div"
            cardId="divider-footer-base"
            className={styles.footerBase}
            onInspect={onInspectLanding}
          >
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
          </CardSurface>
        </div>
      </Band>
      {children}
    </div>
  );
}
