"use client";

import { useState, type FormEvent } from "react";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Type } from "lucide-react";
import {
  Button,
  HybridTokenizedInput,
  MAX_BASE_FONT_SIZE_PX,
  MAX_RATIO,
  MAX_STEP_COUNT,
  MIN_BASE_FONT_SIZE_PX,
  MIN_RATIO,
  MIN_STEP_COUNT,
  TYPE_SCALE_RATIO_PRESETS,
  hybridPresetsFromModularScale,
  type HybridTokenizedValue,
  type TypeScaleInput,
} from "@blueprint/ui";
import { ThemeControl } from "../ThemeControl";
import { WorkspaceNav } from "../WorkspaceNav";
import styles from "./typography-workspace.module.css";

interface TypographyCreationProps {
  onCreate: (details: { name: string } & TypeScaleInput) => void;
}

const SCALE_RATIO_PRESETS = hybridPresetsFromModularScale(
  TYPE_SCALE_RATIO_PRESETS,
);

const DEFAULT_RATIO: HybridTokenizedValue = {
  isPreset: true,
  presetId: "major-third",
  value: 1.25,
};

export function TypographyCreation({ onCreate }: TypographyCreationProps) {
  const [name, setName] = useState("My type scale");
  const [fontFamily, setFontFamily] = useState(
    "Geist Sans, ui-sans-serif, system-ui",
  );
  const [baseFontSizePx, setBaseFontSizePx] = useState(16);
  const [ratio, setRatio] = useState<HybridTokenizedValue>(DEFAULT_RATIO);
  const [stepCount, setStepCount] = useState(9);
  const [error, setError] = useState("");

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
    if (
      !Number.isFinite(ratio.value) ||
      ratio.value < MIN_RATIO ||
      ratio.value > MAX_RATIO
    ) {
      setError(`Ratio must be between ${MIN_RATIO} and ${MAX_RATIO}.`);
      return;
    }

    setError("");
    onCreate({
      name: name.trim(),
      fontFamily: fontFamily.trim(),
      baseFontSizePx,
      ratio: ratio.value,
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
          <HybridTokenizedInput
            decimals={3}
            icon={<Type aria-hidden className="size-3.5" />}
            label="Scale ratio"
            max={MAX_RATIO}
            min={MIN_RATIO}
            popoverTitle="Modular Scale Presets"
            presets={SCALE_RATIO_PRESETS}
            searchPlaceholder="Search scale presets..."
            step={0.001}
            value={ratio}
            onChange={setRatio}
          />
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
