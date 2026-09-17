"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  normalizeHex,
  parseBlueprintWorkspace,
  type WorkspaceProject,
} from "@blueprint/ui";
import { ColourPicker } from "./ColourPicker";
import styles from "./palette-workspace.module.css";

type CreationMethod = "brand" | "generated";

interface PaletteCreationProps {
  onCreate: (details: {
    name: string;
    seedHex: string;
    /* The second brand colour. Chosen here rather than derived: a complement
       computed from the first is a decision about somebody's brand that
       nobody asked this studio to make. */
    secondaryHex: string;
    method: CreationMethod;
  }) => void;
  /* A workspace, not a palette: someone landing here has usually just cleared
     storage and is restoring a whole project file. */
  onImport: (project: WorkspaceProject) => void;
}

export function PaletteCreation({ onCreate, onImport }: PaletteCreationProps) {
  const [name, setName] = useState("My colour system");
  const [seedHex, setSeedHex] = useState("#7646ab");
  const [secondaryHex, setSecondaryHex] = useState("#0f9d8f");
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

  const create = (method: CreationMethod) => {
    try {
      const normalizedSeed = normalizeHex(seedHex);
      const normalizedSecondary = normalizeHex(secondaryHex);
      if (!name.trim()) {
        setError("Enter a project name.");
        return;
      }
      setError("");
      onCreate({
        name: name.trim(),
        seedHex: normalizedSeed,
        secondaryHex: normalizedSecondary,
        method,
      });
    } catch {
      setError("Enter a valid HEX colour, for example #7646ab.");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    create("brand");
  };

  return (
    <div className={styles.creationPage}>
      <form className={styles.creationCard} onSubmit={submit}>
        <h1>New colour system</h1>

        <section className={styles.astryxField}>
          <TextInput
            label="Project name"
            value={name}
            onChange={setName}
            placeholder="My colour system"
          />
        </section>

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

        <section className={styles.field}>
          <span>Secondary colour</span>
          <span className={styles.colourInput}>
            <ColourPicker
              label="secondary colour"
              value={
                /^#[0-9a-f]{6}$/i.test(secondaryHex) ? secondaryHex : "#0f9d8f"
              }
              onChange={setSecondaryHex}
            />
            <TextInput
              isLabelHidden
              label="Secondary colour HEX value"
              value={secondaryHex}
              onChange={setSecondaryHex}
            />
          </span>
        </section>

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <footer className={styles.creationFooter}>
          <span className={styles.creationSecondaryActions}>
            <Button
              scheme="neutral"
              size="small"
              type="button"
              variant="text"
              onClick={() => create("generated")}
            >
              Use Blueprint seed
            </Button>
            <Button
              scheme="neutral"
              size="small"
              type="button"
              variant="text"
              onClick={() => importInputRef.current?.click()}
            >
              Import project
            </Button>
            <input
              ref={importInputRef}
              className={styles.visuallyHidden}
              type="file"
              accept=".json,.blueprint.json,application/json"
              onChange={importProject}
            />
          </span>
          <Button scheme="primary" type="submit">
            Create palette
          </Button>
        </footer>
      </form>
    </div>
  );
}
