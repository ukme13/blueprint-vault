import { describe, expect, it } from "vitest";
import { ratioText } from "./contrast-reading";
import {
  lcLabel,
  readBoundary,
  readFocus,
  readTextCheck,
  readTextChoice,
} from "./accessibility-report";
import { generatePalettes } from "./palette";
import { assessPreview, previewShadesFor } from "./preview-assessment";
import { seedSemanticTokens } from "./semantic";

function assessment() {
  const tracks = generatePalettes({
    tracks: [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "t-neutral", name: "neutral", seedHex: "#737373" },
      { id: "t-success", name: "success", seedHex: "#2f7d32" },
      { id: "t-warning", name: "warning", seedHex: "#b87503" },
      { id: "t-error", name: "error", seedHex: "#b02b1b" },
      { id: "t-info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessValues: [
      97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15,
      10, 5,
    ],
  });
  return assessPreview(
    previewShadesFor(seedSemanticTokens(tracks), tracks, "light")!,
  );
}

describe("lcLabel", () => {
  it("shows the size of the Lc as a whole number", () => {
    expect(lcLabel(86.6)).toBe("Lc 87");
    expect(lcLabel(-75.2)).toBe("Lc 75");
  });
});

describe("readTextCheck", () => {
  it("keeps WCAG 2's own badge, ratio and verdict", () => {
    for (const check of assessment().textChecks) {
      const reading = readTextCheck("wcag2", check);
      /* Cut to a place, never rounded up to a line it is short of. */
      expect(reading.figure).toBe(ratioText(check.result.ratio));
      expect(reading.status).toBe(check.result.status);
      expect(reading.summary).toBe(check.result.summary);
      expect(["AAA", "AA", "Large AA", "Fail"]).toContain(reading.badge);
    }
  });

  it("reads the same check as a tier and an Lc under WCAG 3", () => {
    for (const check of assessment().textChecks) {
      const reading = readTextCheck("wcag3", check);
      expect(reading.figure).toMatch(/^Lc \d+$/);
      expect(["Body", "Large", "UI", "Fail"]).toContain(reading.badge);
      /* Only a body-grade pair is a pass; the tier and the verdict agree. */
      expect(reading.status === "pass").toBe(reading.badge === "Body");
      expect(reading.status === "fail").toBe(reading.badge === "Fail");
    }
  });
});

describe("readBoundary", () => {
  it("is advisory, never a failure, where the check does not count", () => {
    const soft = assessment().nonTextChecks.find(
      (check) => !check.countsTowardWarnings,
    )!;
    for (const standard of ["wcag2", "wcag3"] as const) {
      expect(readBoundary(standard, soft)).toMatchObject({
        badge: "Advisory",
        status: "partial",
      });
    }
  });

  it("judges a counted boundary by 3:1, then by Lc 45", () => {
    const counted = assessment().nonTextChecks.find(
      (check) => check.countsTowardWarnings,
    )!;
    expect(readBoundary("wcag2", counted).badge).toBe(
      counted.result.passes ? "Pass" : "Fail",
    );
    expect(readBoundary("wcag3", counted).figure).toMatch(/^Lc \d+$/);
  });
});

describe("readFocus", () => {
  const wcag2 = {
    adjacentContrast: 5.2,
    status: "pass" as const,
    summary: "ok",
  };

  it("passes WCAG 2's own figures through", () => {
    expect(readFocus("wcag2", "#000000", "#ffffff", wcag2)).toEqual({
      badge: "Pass",
      figure: "5.2:1",
      status: "pass",
      summary: "ok",
    });
  });

  it("measures the ring against the text for WCAG 3", () => {
    expect(readFocus("wcag3", "#000000", "#ffffff", wcag2)).toMatchObject({
      figure: "Lc 106",
      status: "pass",
    });
    expect(readFocus("wcag3", "#eeeeee", "#ffffff", wcag2)).toMatchObject({
      badge: "Fail",
      status: "fail",
    });
  });
});

describe("readTextChoice", () => {
  it("names white or dark and shows both figures in either standard", () => {
    for (const check of assessment().textColourChoices) {
      for (const standard of ["wcag2", "wcag3"] as const) {
        const reading = readTextChoice(standard, check);
        expect(reading.detail).toMatch(/^White .* · Dark .*$/);
        expect(reading.isWhite).toBe(reading.colour === "#ffffff");
      }
    }
  });

  it("recommends the one with the larger Lc under WCAG 3", () => {
    for (const check of assessment().textColourChoices) {
      const reading = readTextChoice("wcag3", check);
      const [white, dark] = reading.detail
        .split(" · ")
        .map((part) => Number(part.replace(/\D/g, "")));
      expect(reading.isWhite).toBe(white! >= dark!);
    }
  });
});

describe("the report judges the Lc it shows", () => {
  const pair = (foreground: string) => ({
    label: "Boundary",
    foreground,
    background: "#ffffff",
    countsTowardWarnings: true,
    simulated: null,
    weakensUnder: [],
    result: {
      ratio: 2,
      passes: false,
      status: "fail" as const,
      summary: "",
    },
  });

  it("passes a boundary at Lc 44.78, which reads Lc 45", () => {
    const reading = readBoundary("wcag3", pair("#acacac"));
    expect(reading).toMatchObject({
      figure: "Lc 45",
      badge: "Pass",
      status: "pass",
    });
  });

  it("fails one at Lc 43", () => {
    expect(readBoundary("wcag3", pair("#b0b0b0"))).toMatchObject({
      figure: "Lc 43",
      badge: "Fail",
    });
  });

  it("passes a focus ring at Lc 44.78 and tiers a text pair on its shown Lc", () => {
    expect(
      readFocus("wcag3", "#acacac", "#ffffff", {
        adjacentContrast: 2,
        status: "fail",
        summary: "",
      }),
    ).toMatchObject({ figure: "Lc 45", status: "pass" });
    /* Lc 74.76 reads Lc 75: body grade. */
    expect(
      readTextCheck("wcag3", {
        foreground: "#6f6f6f",
        background: "#ffffff",
      } as never),
    ).toMatchObject({ figure: "Lc 75", badge: "Body", status: "pass" });
  });
});
