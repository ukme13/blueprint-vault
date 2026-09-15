import type { CSSProperties } from "react";
import {
  assessTextContrastAtSize,
  elementForRole,
  formatLength,
  generateTypeSteps,
  resolveLineHeight,
  resolveRoleSizePx,
  type PreviewDevice,
  type TypeRole,
  type TypeScaleUnit,
  type TypeSystem,
} from "@blueprint/ui";
import { SpecimenTextField } from "./SpecimenTextField";
import styles from "./typography-workspace.module.css";

export interface PreviewSpecimenListProps {
  system: TypeSystem;
  roles: TypeRole[];
  device: PreviewDevice;
  unit: TypeScaleUnit;
  remRootPx: number;
  specimenText: string;
  styleOf: (role: TypeRole) => CSSProperties;
  textHex: string | null;
  backgroundHex: string | null;
  onSpecimenTextChange: (text: string) => void;
}

export function PreviewSpecimenList({
  system,
  roles,
  device,
  unit,
  remRootPx,
  specimenText,
  styleOf,
  textHex,
  backgroundHex,
  onSpecimenTextChange,
}: PreviewSpecimenListProps) {
  const steps = generateTypeSteps(
    system.baseFontSizePx,
    device.ratio,
    system.stepCount,
  );

  return roles.map((role) => {
    const Tag = elementForRole(system, role);
    const fontSizePx = resolveRoleSizePx(system, steps, role, device.id);
    /* Judged at this role's own size and weight: the same pair of
       colours passes at a heading and fails at a caption. */
    const contrast =
      textHex && backgroundHex
        ? assessTextContrastAtSize(
            textHex,
            backgroundHex,
            fontSizePx,
            role.fontWeight,
          )
        : null;
    const lineHeightPx = resolveLineHeight(
      role,
      fontSizePx,
      device.id,
      system,
    ).computedLineHeightPx;

    return (
      <article key={role.id} className={styles.previewRole}>
        <header>
          <h3>{role.id}</h3>
          <p>
            {formatLength(fontSizePx, unit, remRootPx)} · weight{" "}
            {role.fontWeight} · line height {lineHeightPx}px · {Tag}
          </p>
          {contrast && (
            <p className={styles.previewContrast} data-status={contrast.status}>
              {contrast.ratio.toFixed(2)}:1 · {contrast.summary}
            </p>
          )}
        </header>
        <Tag style={styleOf(role)}>
          <SpecimenTextField
            value={specimenText}
            onChange={onSpecimenTextChange}
          />
        </Tag>
      </article>
    );
  });
}
