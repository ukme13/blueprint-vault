"use client";

import { useState, type FormEvent } from "react";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  MAX_BASE_FONT_SIZE_PX,
  MAX_RATIO,
  MAX_STEP_COUNT,
  MIN_BASE_FONT_SIZE_PX,
  MIN_RATIO,
  MIN_STEP_COUNT,
  TYPE_SCALE_RATIO_PRESETS,
  type TypeScaleInput,
} from "@blueprint/ui";
import { ThemeControl } from "../ThemeControl";
import { WorkspaceNav } from "../WorkspaceNav";
import styles from "./typography-workspace.module.css";

interface TypographyCreationProps {
  onCreate: (details: { name: string } & TypeScaleInput) => void;
}

export function TypographyCreation({ onCreate }: TypographyCreationProps) {
  const [name, setName] = useState("My type scale");
  const [fontFamily, setFontFamily] = useState(
    "Geist Sans, ui-sans-serif, system-ui",
  );
  const [baseFontSizePx, setBaseFontSizePx] = useState(16);
  const [ratioPresetId, setRatioPresetId] = useState("major-third");
  const [customRatio, setCustomRatio] = useState(1.25);
  const [stepCount, setStepCount] = useState(9);
  const [error, setError] = useState("");

  const preset = TYPE_SCALE_RATIO_PRESETS.find(
    (candidate) => candidate.id === ratioPresetId,
  );
  const ratio =
    ratioPresetId === "custom" ? customRatio : (preset?.ratio ?? 1.25);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Enter a project name.");
      return;
    }
    if (!fontFamily.trim()) {
      setError("Enter a font family.");
      return;
    }
    if (!Number.isFinite(ratio) || ratio < MIN_RATIO || ratio > MAX_RATIO) {
      setError(`Ratio must be between ${MIN_RATIO} and ${MAX_RATIO}.`);
      return;
    }

    setError("");
    onCreate({
      name: name.trim(),
      fontFamily: fontFamily.trim(),
      baseFontSizePx,
      ratio,
      stepCount,
    });
  };

  return (
    <main className={styles.creationPage}>
      <header className={styles.creationHeader}>
        <p className={styles.brand}>
          <span aria-hidden="true" className={styles.brandMark}>
            B
          </span>
          Blueprint
        </p>
        <ThemeControl />
        <WorkspaceNav active="typography" />
      </header>

      <form className={styles.creationCard} onSubmit={submit}>
        <h1>Create your type scale</h1>
        <p className={styles.creationIntro}>
          Start with a base font size and a scale ratio. Blueprint will generate
          the steps and map them to semantic roles like display, heading, title,
          body, label, and caption.
        </p>

        <section className={styles.astryxField}>
          <TextInput
            label="Project name"
            value={name}
            onChange={setName}
            placeholder="My type scale"
          />
        </section>

        <section className={styles.astryxField}>
          <TextInput
            label="Font family"
            value={fontFamily}
            onChange={setFontFamily}
            placeholder="Geist Sans, ui-sans-serif, system-ui"
          />
        </section>

        <section className={styles.creationGrid}>
          <NumberInput
            label="Base font size"
            min={MIN_BASE_FONT_SIZE_PX}
            max={MAX_BASE_FONT_SIZE_PX}
            units="px"
            value={baseFontSizePx}
            onChange={setBaseFontSizePx}
          />
          <Selector
            label="Scale ratio"
            options={[
              ...TYPE_SCALE_RATIO_PRESETS.map((ratioPreset) => ({
                label: `${ratioPreset.name} (${ratioPreset.ratio})`,
                value: ratioPreset.id,
              })),
              { label: "Custom", value: "custom" },
            ]}
            value={ratioPresetId}
            onChange={setRatioPresetId}
          />
          {ratioPresetId === "custom" && (
            <NumberInput
              label="Custom ratio"
              min={MIN_RATIO}
              max={MAX_RATIO}
              step={0.01}
              value={customRatio}
              onChange={setCustomRatio}
            />
          )}
          <NumberInput
            isIntegerOnly
            label="Number of steps"
            min={MIN_STEP_COUNT}
            max={MAX_STEP_COUNT}
            value={stepCount}
            onChange={setStepCount}
          />
        </section>

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <footer className={styles.creationFooter}>
          <p>
            Roles:{" "}
            <strong>display, heading, title, body, label, caption</strong>
          </p>
          <Button scheme="primary" type="submit">
            Create type scale
          </Button>
        </footer>
      </form>
    </main>
  );
}
