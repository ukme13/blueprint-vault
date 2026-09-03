"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  normalizeHex,
  parseBlueprintWorkspace,
  type WorkspaceProject,
} from "@blueprint/ui";
import { ThemeControl } from "../ThemeControl";
import { WorkspaceNav } from "../WorkspaceNav";
import { ColourPicker } from "./ColourPicker";
import styles from "./palette-workspace.module.css";

type CreationMethod = "brand" | "generated";

interface PaletteCreationProps {
  onCreate: (details: {
    name: string;
    seedHex: string;
    method: CreationMethod;
  }) => void;
  /* A workspace, not a palette: someone landing here has usually just cleared
     storage and is restoring a whole project file. */
  onImport: (project: WorkspaceProject) => void;
}

export function PaletteCreation({ onCreate, onImport }: PaletteCreationProps) {
  const [name, setName] = useState("My colour system");
  const [seedHex, setSeedHex] = useState("#7646ab");
  const [method, setMethod] = useState<CreationMethod>("brand");
  const [error, setError] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      onImport(parseBlueprintWorkspace(await file.text()));
    } catch {
      setError("Choose a valid Blueprint project file.");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const normalizedSeed = normalizeHex(seedHex);
      if (!name.trim()) {
        setError("Enter a project name.");
        return;
      }
      setError("");
      onCreate({ name: name.trim(), seedHex: normalizedSeed, method });
    } catch {
      setError("Enter a valid HEX colour, for example #7646ab.");
    }
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
        <span className={styles.creationHeaderActions}>
          <ThemeControl />
          <WorkspaceNav active="colour" />
          <a href="http://localhost:3001">Documentation</a>
        </span>
      </header>

      <form className={styles.creationCard} onSubmit={submit}>
        <h1>Create your colour system</h1>
        <p className={styles.creationIntro}>
          Start with one colour. Blueprint will build 20 stable OKLCH shades and
          the main semantic tracks.
        </p>

        <section className={styles.astryxField}>
          <TextInput
            label="Project name"
            value={name}
            onChange={setName}
            placeholder="My colour system"
          />
        </section>

        <fieldset className={styles.methodFieldset}>
          <legend>How do you want to start?</legend>
          <section className={styles.methodGrid}>
            <span className={styles.methodCard}>
              <SelectableCard
                label="Start with a brand colour"
                isSelected={method === "brand"}
                onChange={() => setMethod("brand")}
              >
                <strong>Brand colour</strong>
                <span>Use your own main colour as the source.</span>
              </SelectableCard>
            </span>
            <span className={styles.methodCard}>
              <SelectableCard
                label="Start with a generated set"
                isSelected={method === "generated"}
                onChange={() => setMethod("generated")}
              >
                <strong>Generated set</strong>
                <span>Start from a ready-made Blueprint set.</span>
              </SelectableCard>
            </span>
            <span className={styles.methodCard}>
              <SelectableCard
                label="Import Blueprint project"
                isSelected={false}
                onChange={() => importInputRef.current?.click()}
              >
                <strong>Import project</strong>
                <span>Continue editing a saved Blueprint palette.</span>
              </SelectableCard>
              <input
                ref={importInputRef}
                className={styles.visuallyHidden}
                type="file"
                accept=".json,.blueprint.json,application/json"
                onChange={importProject}
              />
            </span>
          </section>
        </fieldset>

        {method === "brand" && (
          <section className={styles.field}>
            <span>Source colour</span>
            <span className={styles.colourInput}>
              <ColourPicker
                label="source colour"
                value={/^#[0-9a-f]{6}$/i.test(seedHex) ? seedHex : "#7646ab"}
                onChange={setSeedHex}
              />
              <TextInput
                isLabelHidden
                label="Source colour HEX value"
                value={seedHex}
                onChange={setSeedHex}
              />
            </span>
          </section>
        )}

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <footer className={styles.creationFooter}>
          <p>
            Preset: <strong>Blueprint 20</strong>
          </p>
          <Button scheme="primary" type="submit">
            Create palette
          </Button>
        </footer>
      </form>
    </main>
  );
}
