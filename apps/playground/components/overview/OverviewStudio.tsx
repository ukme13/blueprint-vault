"use client";

import { useMemo } from "react";
import {
  generatePalettes,
  recommendTextColour,
  seedTypographyProject,
  useWorkspaceStore,
  type TypeFont,
  type TypeRole,
} from "@blueprint/ui";
import {
  Home,
  Pencil,
  Search,
  Shapes,
  Tag,
  Trash2,
  User,
  Wand2,
} from "lucide-react";
import { usePaletteView } from "../palette/PaletteViewContext";
import { useGoogleFontsLink } from "../typography/use-google-fonts";
import { useLocalFonts } from "../typography/use-local-fonts";
import { VisionControl } from "../VisionControl";
import styles from "./overview.module.css";

function fontCssFamily(font: TypeFont | null, fallback: string): string {
  if (!font?.families?.length) return fallback;
  return (
    font.families.map((f) => (f.includes(" ") ? `"${f}"` : f)).join(", ") +
    `, ${fallback}`
  );
}

function fontDisplayName(font: TypeFont | null, fallback: string): string {
  if (!font) return fallback;
  if (font.name && font.name !== "Untitled") return font.name;
  if (font.families?.length) return font.families[0] ?? fallback;
  return fallback;
}

/**
 * 4-Column Bento Specimen Studio.
 *
 * Renders an overall design system specimen board displaying color tracks with
 * their generated 25-interval shade ramps, typography stacks with live Aa
 * specimens, standard interactive button variants, progress data bars, and
 * navigation tools.
 */
export function OverviewStudio() {
  const { project, hasLoaded } = useWorkspaceStore();
  const { seen } = usePaletteView();

  const palettes = useMemo(
    () => (project?.palette ? generatePalettes(project.palette) : []),
    [project],
  );

  const typography =
    project?.typography ?? seedTypographyProject(project?.name ?? "Workspace");
  const system = typography.system;

  useGoogleFontsLink(system, undefined, 400);
  useLocalFonts(system);

  // Column 1: Color Tracks
  const primaryTrack =
    palettes.find(
      (t) => t.id === "primary" || t.name.toLowerCase() === "primary",
    ) ?? palettes[0];

  const secondaryTrack =
    palettes.find(
      (t) => t.id === "secondary" || t.name.toLowerCase() === "secondary",
    ) ??
    (palettes.length >= 2 && palettes[1] !== primaryTrack
      ? palettes[1]
      : undefined);

  const tertiaryTrack =
    palettes.find(
      (t) =>
        t.id === "tertiary" ||
        t.id === "info" ||
        t.id === "success" ||
        t.name.toLowerCase() === "tertiary" ||
        t.name.toLowerCase() === "success",
    ) ??
    (palettes.length >= 3 &&
    palettes[2] !== primaryTrack &&
    palettes[2] !== secondaryTrack
      ? palettes[2]
      : undefined);

  const errorTrack = palettes.find(
    (t) =>
      t.id === "error" ||
      t.name.toLowerCase() === "error" ||
      t.name.toLowerCase().includes("err") ||
      t.name.toLowerCase().includes("danger"),
  );

  // Column 2: Typography Roles & Fonts
  const typeCards = useMemo(() => {
    const list: Array<{
      role: TypeRole;
      category: string;
      cardId: string;
    }> = [];

    const headlineRole = system.roles.find(
      (r) =>
        r.id.startsWith("h") ||
        r.id.startsWith("display") ||
        r.groupId === "display" ||
        r.groupId === "heading" ||
        r.name.toLowerCase().includes("head") ||
        r.name.toLowerCase().includes("display"),
    );

    const bodyRole = system.roles.find(
      (r) =>
        (r.id === "body" ||
          r.id === "p" ||
          r.groupId === "body" ||
          r.name.toLowerCase().includes("body")) &&
        r !== headlineRole,
    );

    const labelRole = system.roles.find(
      (r) =>
        (r.id === "label" ||
          r.id === "caption" ||
          r.groupId === "label" ||
          r.name.toLowerCase().includes("label") ||
          r.name.toLowerCase().includes("caption")) &&
        r !== headlineRole &&
        r !== bodyRole,
    );

    if (headlineRole) {
      list.push({
        role: headlineRole,
        category: "Headline",
        cardId: "headline",
      });
    }
    if (bodyRole) {
      list.push({
        role: bodyRole,
        category: "Body",
        cardId: "body",
      });
    }
    if (labelRole) {
      list.push({
        role: labelRole,
        category: "Label",
        cardId: "label",
      });
    }

    for (const r of system.roles) {
      if (list.length >= 3) break;
      if (!list.some((item) => item.role.id === r.id)) {
        const cat = r.name.charAt(0).toUpperCase() + r.name.slice(1);
        list.push({
          role: r,
          category: cat,
          cardId: r.id.toLowerCase(),
        });
      }
    }

    return list;
  }, [system.roles]);

  const resolveRoleFont = (role?: TypeRole) => {
    if (!role) return null;
    return (
      system.fonts.find((f) => f.id === role.fontId) ?? system.fonts[0] ?? null
    );
  };

  if (!hasLoaded) {
    return <div aria-busy="true" className="h-full min-h-0" />;
  }

  const primarySeedHex = primaryTrack ? seen(primaryTrack.seedHex) : undefined;
  const primaryTextColor = primarySeedHex
    ? recommendTextColour(primarySeedHex).colour
    : undefined;

  const secondarySeedHex = secondaryTrack
    ? seen(secondaryTrack.seedHex)
    : undefined;
  const secondaryTextColor = secondarySeedHex
    ? recommendTextColour(secondarySeedHex).colour
    : undefined;

  const tertiarySeedHex = tertiaryTrack
    ? seen(tertiaryTrack.seedHex)
    : undefined;
  const tertiaryTextColor = tertiarySeedHex
    ? recommendTextColour(tertiarySeedHex).colour
    : undefined;

  const errorSeedHex = errorTrack ? seen(errorTrack.seedHex) : undefined;
  const errorTextColor = errorSeedHex
    ? recommendTextColour(errorSeedHex).colour
    : undefined;

  return (
    <div className={styles.overviewRoot} data-overview-studio="true">
      <header className={styles.topBar}>
        <div className={styles.topBarHeading}>
          <h1 className={styles.pageTitle}>Overview</h1>
          <span className={styles.pageSubtitle}>
            Design system specimen board
          </span>
        </div>
        <div className={styles.topBarActions}>
          <VisionControl />
        </div>
      </header>

      <main className={styles.canvas}>
        <div className={styles.bentoGrid} data-overview-grid="true">
          {/* Column 1: Color Families */}
          <div className={styles.column} data-column="colors">
            {palettes.length > 0 ? (
              palettes.map((track) => {
                const seedHex = seen(track.seedHex);
                const textColor = recommendTextColour(seedHex).colour;
                const shades = [...(track.shades ?? [])].sort(
                  (a, b) => b.weight - a.weight,
                );
                const displayName = track.name
                  ? track.name.charAt(0).toUpperCase() + track.name.slice(1)
                  : track.id.charAt(0).toUpperCase() + track.id.slice(1);
                const hexDisplay = track.seedHex
                  ? track.seedHex.toUpperCase()
                  : "";

                return (
                  <div
                    key={track.id}
                    className={styles.colorCard}
                    data-color-card={track.name.toLowerCase()}
                  >
                    <div
                      className={styles.colorCardTop}
                      style={{ backgroundColor: seedHex, color: textColor }}
                    >
                      <span className={styles.colorCardName}>
                        {displayName}
                      </span>
                      <span className={styles.colorCardHex}>{hexDisplay}</span>
                    </div>
                    <div
                      className={styles.colorRamp}
                      aria-label={`${displayName} shades`}
                    >
                      {shades.map((shade) => (
                        <div
                          key={shade.weight}
                          className={styles.colorRampSlice}
                          style={{ backgroundColor: seen(shade.hex) }}
                          title={`${track.name}-${shade.weight}: ${shade.hex}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.card} data-color-card="empty">
                <div className={styles.emptyCard}>
                  <span>No color families</span>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Typography Stack */}
          <div className={styles.column} data-column="typography">
            {typeCards.length > 0 ? (
              typeCards.map(({ role, category, cardId }) => {
                const font = resolveRoleFont(role);
                const family = fontCssFamily(font, "Space Grotesk, sans-serif");
                return (
                  <div
                    key={role.id}
                    className={styles.typeCard}
                    data-type-card={cardId}
                  >
                    <div className={styles.typeCardHeader}>
                      <span className={styles.typeCardRole}>{category}</span>
                      <span className={styles.typeCardFamily}>
                        {fontDisplayName(font, "Inter")}
                      </span>
                    </div>
                    <div
                      className={styles.typeCardGlyph}
                      style={{
                        fontFamily: family,
                        fontWeight: role.fontWeight ?? 400,
                      }}
                    >
                      Aa
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.card} data-type-card="empty">
                <div className={styles.emptyCard}>
                  <span>No typography roles</span>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: UI Specimens */}
          <div className={styles.column} data-column="components">
            <div className={styles.card}>
              <div className={styles.buttonGridCard}>
                {primaryTrack && primarySeedHex ? (
                  <button
                    type="button"
                    className={`${styles.specimenBtn} ${!secondaryTrack ? styles.specimenBtnSpan2 : ""}`}
                    style={{
                      backgroundColor: primarySeedHex,
                      color: primaryTextColor,
                    }}
                  >
                    Primary
                  </button>
                ) : null}
                {secondaryTrack && secondarySeedHex ? (
                  <button
                    type="button"
                    className={styles.specimenBtn}
                    style={{
                      backgroundColor: secondarySeedHex,
                      color: secondaryTextColor,
                    }}
                  >
                    Secondary
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${styles.specimenBtn} ${styles.specimenBtnInverted}`}
                >
                  Inverted
                </button>
                <button
                  type="button"
                  className={`${styles.specimenBtn} ${styles.specimenBtnOutlined}`}
                >
                  Outlined
                </button>
              </div>
            </div>

            {(() => {
              const bars: Array<{
                key: string;
                color: string;
                width: string;
              }> = [];
              if (primarySeedHex) {
                bars.push({
                  key: "primary-1",
                  color: primarySeedHex,
                  width: "70%",
                });
              }
              if (secondarySeedHex) {
                bars.push({
                  key: "secondary",
                  color: secondarySeedHex,
                  width: "85%",
                });
              }
              if (tertiarySeedHex) {
                bars.push({
                  key: "tertiary",
                  color: tertiarySeedHex,
                  width: "55%",
                });
              }
              if (bars.length === 0) return null;
              return (
                <div className={styles.progressCard}>
                  {bars.map((bar) => (
                    <div key={bar.key} className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{
                          width: bar.width,
                          backgroundColor: bar.color,
                        }}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}

            {tertiaryTrack || primaryTrack ? (
              <div className={styles.splitRow}>
                {tertiaryTrack && tertiarySeedHex ? (
                  <div className={styles.iconCard} data-icon-card="tertiary">
                    <div
                      className={styles.miniIconBox}
                      style={{
                        backgroundColor: tertiarySeedHex,
                        color: tertiaryTextColor,
                      }}
                    >
                      <Pencil size={18} strokeWidth={2} />
                    </div>
                  </div>
                ) : null}
                {primaryTrack && primarySeedHex ? (
                  <div className={styles.pillCard} data-pill-card="primary">
                    <div
                      className={styles.actionPill}
                      style={{
                        backgroundColor: primarySeedHex,
                        color: primaryTextColor,
                      }}
                    >
                      <Pencil size={15} strokeWidth={2} />
                      <span>Label</span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Column 4: Navigation & Tools */}
          <div className={styles.column} data-column="tools">
            <div className={styles.searchCard}>
              <div className={styles.searchBox}>
                <Search size={18} strokeWidth={2} />
                <input
                  type="search"
                  placeholder="Search"
                  className={styles.searchInput}
                  readOnly
                  aria-label="Search"
                />
              </div>
            </div>

            <div className={styles.navCard}>
              <div
                className={styles.navPill}
                role="navigation"
                aria-label="Specimen navigation"
              >
                <div
                  className={styles.navActiveItem}
                  style={{
                    backgroundColor:
                      primarySeedHex ?? "var(--color-action-primary)",
                    color: primaryTextColor ?? "var(--color-fg-on-action)",
                  }}
                >
                  <Home size={18} strokeWidth={2} />
                </div>
                <div className={styles.navInactiveItem}>
                  <Search size={18} strokeWidth={2} />
                </div>
                <div className={styles.navInactiveItem}>
                  <User size={18} strokeWidth={2} />
                </div>
              </div>
            </div>

            <div className={styles.actionIconsCard}>
              <div className={styles.actionIconsRow}>
                {primaryTrack && primarySeedHex ? (
                  <div
                    className={styles.actionIconSquare}
                    data-action-tool="wand"
                    style={{
                      backgroundColor: primarySeedHex,
                      color: primaryTextColor,
                    }}
                    title="Wand tool"
                  >
                    <Wand2 size={20} strokeWidth={2} />
                  </div>
                ) : null}
                {secondaryTrack && secondarySeedHex ? (
                  <div
                    className={styles.actionIconSquare}
                    data-action-tool="shapes"
                    style={{
                      backgroundColor: secondarySeedHex,
                      color: secondaryTextColor,
                    }}
                    title="Shapes"
                  >
                    <Shapes size={20} strokeWidth={2} />
                  </div>
                ) : null}
                {primaryTrack && primarySeedHex ? (
                  <div
                    className={styles.actionIconSquare}
                    data-action-tool="tag"
                    style={{
                      backgroundColor: primarySeedHex,
                      color: primaryTextColor,
                    }}
                    title="Tag"
                  >
                    <Tag size={20} strokeWidth={2} />
                  </div>
                ) : null}
                {errorTrack && errorSeedHex ? (
                  <div
                    className={styles.actionIconSquare}
                    data-action-tool="delete"
                    style={{
                      backgroundColor: errorSeedHex,
                      color: errorTextColor,
                    }}
                    title="Delete"
                  >
                    <Trash2 size={20} strokeWidth={2} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
