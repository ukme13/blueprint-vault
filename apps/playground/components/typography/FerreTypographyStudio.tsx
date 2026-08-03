"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  createFerreTypographyPreset,
  formatResponsiveTypographyCssExport,
  type ResponsiveTypographyRole,
  type ResponsiveTypographySystem,
  type TypographyTextTransform,
  type TypographyViewport,
} from "@blueprint/ui";
import { WorkspaceNav } from "../WorkspaceNav";
import styles from "./ferre-typography.module.css";

const STORAGE_KEY = "blueprint.ferre-typography.v1";
const PREVIEW_TEXT = "THE FUTURE IS BUILT TO MOVE";

function readSystem(): ResponsiveTypographySystem {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return createFerreTypographyPreset();
    const parsed = JSON.parse(stored) as ResponsiveTypographySystem;
    if (!Array.isArray(parsed.fonts) || !Array.isArray(parsed.roles)) {
      return createFerreTypographyPreset();
    }
    return parsed;
  } catch {
    return createFerreTypographyPreset();
  }
}

function roleStyle(
  system: ResponsiveTypographySystem,
  role: ResponsiveTypographyRole,
  viewport: TypographyViewport,
): CSSProperties {
  const font = system.fonts.find(
    (candidate) => candidate.id === role.fontFamilyId,
  );
  const value = role[viewport];
  return {
    fontFamily: font?.value,
    fontSize: `${value.fontSizePx}px`,
    fontWeight: role.fontWeight,
    lineHeight: value.lineHeight,
    letterSpacing: `${value.letterSpacingPx}px`,
    textTransform: role.textTransform,
  };
}

export function FerreTypographyStudio() {
  const [system, setSystem] = useState<ResponsiveTypographySystem | null>(null);
  const [viewport, setViewport] = useState<TypographyViewport>("desktop");
  const [selectedRoleId, setSelectedRoleId] = useState("h1");
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => setSystem(readSystem()), []);
  useEffect(() => {
    if (system)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(system));
  }, [system]);

  const selectedRole = system?.roles.find((role) => role.id === selectedRoleId);
  const groups = useMemo(
    () => (system ? [...new Set(system.roles.map((role) => role.group))] : []),
    [system],
  );

  if (!system || !selectedRole) {
    return <main className={styles.loading}>Loading Ferre typography…</main>;
  }

  const updateRole = (patch: Partial<ResponsiveTypographyRole>) => {
    setSystem((current) =>
      current
        ? {
            ...current,
            roles: current.roles.map((role) =>
              role.id === selectedRoleId ? { ...role, ...patch } : role,
            ),
          }
        : current,
    );
  };

  const updateViewportValue = (
    patch: Partial<ResponsiveTypographyRole[TypographyViewport]>,
  ) => updateRole({ [viewport]: { ...selectedRole[viewport], ...patch } });

  const resetPreset = () => {
    const preset = createFerreTypographyPreset();
    setSystem(preset);
    setSelectedRoleId(preset.roles[0]!.id);
  };

  const addRole = () => {
    const id = `custom-${Date.now()}`;
    const role: ResponsiveTypographyRole = {
      ...structuredClone(selectedRole),
      id,
      name: "new-role",
      group: "Custom",
    };
    setSystem((current) =>
      current ? { ...current, roles: [...current.roles, role] } : current,
    );
    setSelectedRoleId(id);
  };

  const duplicateRole = () => {
    const id = `${selectedRole.id}-copy-${Date.now()}`;
    const role = {
      ...structuredClone(selectedRole),
      id,
      name: `${selectedRole.name}-copy`,
    };
    setSystem((current) =>
      current ? { ...current, roles: [...current.roles, role] } : current,
    );
    setSelectedRoleId(id);
  };

  const removeRole = () => {
    if (system.roles.length === 1) return;
    const nextRoles = system.roles.filter((role) => role.id !== selectedRoleId);
    setSystem({ ...system, roles: nextRoles });
    setSelectedRoleId(nextRoles[0]!.id);
  };

  const output = formatResponsiveTypographyCssExport(system);
  const download = () => {
    const url = URL.createObjectURL(new Blob([output], { type: "text/css" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ferre-typography.css";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <main className={styles.workspace}>
      <header className={styles.topbar}>
        <p className={styles.brand}>
          <strong>B</strong> Blueprint <span>/</span> Ferre EN
        </p>
        <nav aria-label="Preview viewport">
          <TabList
            size="sm"
            value={viewport}
            onChange={(value) => setViewport(value as TypographyViewport)}
          >
            <Tab label="Desktop" value="desktop" />
            <Tab label="Mobile" value="mobile" />
          </TabList>
        </nav>
        <span className={styles.actions}>
          <WorkspaceNav active="typography" />
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

      <section className={styles.toolbar} aria-label="Ferre typography toolbar">
        <Link href="/typography">Modular scale</Link>
        <span>
          {system.roles.length} roles · {system.fonts.length} fonts
        </span>
        <Button scheme="neutral" size="xs" variant="text" onClick={resetPreset}>
          Reset Ferre preset
        </Button>
      </section>

      <section className={styles.editor}>
        <aside className={styles.roleList} aria-label="Typography roles">
          {groups.map((group) => (
            <section key={group}>
              <h2>{group}</h2>
              {system.roles
                .filter((role) => role.group === group)
                .map((role) => (
                  <button
                    key={role.id}
                    aria-pressed={role.id === selectedRoleId}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <span>{role.name}</span>
                    <small>{role[viewport].fontSizePx}px</small>
                  </button>
                ))}
            </section>
          ))}
        </aside>

        <section
          className={styles.preview}
          aria-label="Ferre typography preview"
          data-viewport={viewport}
        >
          <header>
            <p>{selectedRole.group}</p>
            <h1>{selectedRole.name}</h1>
          </header>
          <article style={roleStyle(system, selectedRole, viewport)}>
            {PREVIEW_TEXT}
          </article>
          <article lang="th" style={roleStyle(system, selectedRole, viewport)}>
            อนาคตสร้างขึ้นเพื่อการเคลื่อนไหว
          </article>
          <dl>
            <div>
              <dt>Viewport</dt>
              <dd>{viewport}</dd>
            </div>
            <div>
              <dt>Font</dt>
              <dd>
                {
                  system.fonts.find(
                    (font) => font.id === selectedRole.fontFamilyId,
                  )?.name
                }
              </dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{selectedRole[viewport].fontSizePx}px</dd>
            </div>
            <div>
              <dt>Line height</dt>
              <dd>{Math.round(selectedRole[viewport].lineHeight * 100)}%</dd>
            </div>
          </dl>
        </section>

        <aside className={styles.inspector} aria-label="Selected role settings">
          <header>
            <h2>Role settings</h2>
            <p>{viewport} values</p>
          </header>
          <div className={styles.settingGroup}>
            <TextInput
              label="Role name"
              value={selectedRole.name}
              onChange={(name) => updateRole({ name })}
            />
            <TextInput
              label="Group"
              value={selectedRole.group}
              onChange={(group) => updateRole({ group })}
            />
            <Selector
              label="Font family"
              value={selectedRole.fontFamilyId}
              options={system.fonts.map((font) => ({
                label: font.name,
                value: font.id,
              }))}
              onChange={(fontFamilyId) => updateRole({ fontFamilyId })}
            />
            <NumberInput
              isIntegerOnly
              label="Font weight"
              min={100}
              max={900}
              step={100}
              value={selectedRole.fontWeight}
              onChange={(fontWeight) => updateRole({ fontWeight })}
            />
            <NumberInput
              label={`${viewport} font size`}
              min={8}
              max={160}
              units="px"
              value={selectedRole[viewport].fontSizePx}
              onChange={(fontSizePx) => updateViewportValue({ fontSizePx })}
            />
            <NumberInput
              label={`${viewport} line height`}
              min={0.8}
              max={2.5}
              step={0.05}
              value={selectedRole[viewport].lineHeight}
              onChange={(lineHeight) => updateViewportValue({ lineHeight })}
            />
            <NumberInput
              label={`${viewport} letter spacing`}
              min={-5}
              max={10}
              step={0.05}
              units="px"
              value={selectedRole[viewport].letterSpacingPx}
              onChange={(letterSpacingPx) =>
                updateViewportValue({ letterSpacingPx })
              }
            />
            <Selector
              label="Text transform"
              value={selectedRole.textTransform}
              options={[
                { label: "Unchanged", value: "none" },
                { label: "Uppercase", value: "uppercase" },
                { label: "Title case", value: "capitalize" },
              ]}
              onChange={(textTransform) =>
                updateRole({
                  textTransform: textTransform as TypographyTextTransform,
                })
              }
            />
            <div className={styles.roleActions}>
              <Button
                scheme="neutral"
                size="small"
                variant="outlined"
                onClick={addRole}
              >
                Add role
              </Button>
              <Button
                scheme="neutral"
                size="small"
                variant="outlined"
                onClick={duplicateRole}
              >
                Duplicate
              </Button>
              <Button
                disabled={system.roles.length === 1}
                scheme="error"
                size="small"
                variant="text"
                onClick={removeRole}
              >
                Remove
              </Button>
            </div>
          </div>
        </aside>
      </section>

      {isExportOpen && (
        <section
          className={styles.exportPanel}
          role="dialog"
          aria-modal="true"
          aria-label="Export Ferre typography"
        >
          <header>
            <h2>Export Ferre typography</h2>
            <Button
              scheme="neutral"
              size="xs"
              variant="text"
              onClick={() => setIsExportOpen(false)}
            >
              Close
            </Button>
          </header>
          <pre>
            <code>{output}</code>
          </pre>
          <footer>
            <Button scheme="primary" onClick={download}>
              Download CSS
            </Button>
          </footer>
        </section>
      )}
    </main>
  );
}
