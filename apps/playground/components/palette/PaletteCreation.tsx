"use client";

import { useState, type FormEvent } from "react";
import { normalizeHex } from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

type CreationMethod = "brand" | "generated";

interface PaletteCreationProps {
  onCreate: (details: {
    name: string;
    seedHex: string;
    method: CreationMethod;
  }) => void;
}

export function PaletteCreation({ onCreate }: PaletteCreationProps) {
  const [name, setName] = useState("My colour system");
  const [seedHex, setSeedHex] = useState("#7646ab");
  const [method, setMethod] = useState<CreationMethod>("brand");
  const [error, setError] = useState("");

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
        <a href="http://localhost:3001">Documentation</a>
      </header>

      <form className={styles.creationCard} onSubmit={submit}>
        <span className={styles.eyebrow}>New palette</span>
        <h1>Create your colour system</h1>
        <p className={styles.creationIntro}>
          Start with one colour. Blueprint will build 20 stable OKLCH shades and
          the main semantic tracks.
        </p>

        <label className={styles.field}>
          <span>Project name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My colour system"
          />
        </label>

        <fieldset className={styles.methodFieldset}>
          <legend>How do you want to start?</legend>
          <section className={styles.methodGrid}>
            <label
              className={method === "brand" ? styles.methodSelected : undefined}
            >
              <input
                checked={method === "brand"}
                name="method"
                type="radio"
                onChange={() => setMethod("brand")}
              />
              <strong>Brand colour</strong>
              <span>Use your own main colour as the source.</span>
            </label>
            <label
              className={
                method === "generated" ? styles.methodSelected : undefined
              }
            >
              <input
                checked={method === "generated"}
                name="method"
                type="radio"
                onChange={() => setMethod("generated")}
              />
              <strong>Generated set</strong>
              <span>Start from a ready-made Blueprint set.</span>
            </label>
            <label aria-disabled="true" className={styles.methodDisabled}>
              <input disabled name="method" type="radio" />
              <strong>
                Import tokens <small>Soon</small>
              </strong>
              <span>Bring an existing token file into Blueprint.</span>
            </label>
          </section>
        </fieldset>

        {method === "brand" && (
          <label className={styles.field}>
            <span>Source colour</span>
            <span className={styles.colourInput}>
              <input
                aria-label="Choose source colour"
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(seedHex) ? seedHex : "#7646ab"}
                onChange={(event) => setSeedHex(event.target.value)}
              />
              <input
                aria-label="Source colour HEX value"
                value={seedHex}
                onChange={(event) => setSeedHex(event.target.value)}
              />
            </span>
          </label>
        )}

        {error && <p className={styles.formError}>{error}</p>}

        <footer className={styles.creationFooter}>
          <p>
            Preset: <strong>Blueprint 20</strong>
          </p>
          <button type="submit">Create palette</button>
        </footer>
      </form>
    </main>
  );
}
