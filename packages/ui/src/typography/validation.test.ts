import { describe, expect, it } from "vitest";
import {
  assessBodyFontSize,
  assessLineHeight,
  assessRoleWeights,
  assessScaleGrowth,
  assessStepCount,
} from "./validation";
import type { RoleAssignment } from "./types";

describe("assessBodyFontSize", () => {
  it("passes comfortable sizes and warns or fails below the thresholds", () => {
    expect(assessBodyFontSize(16).status).toBe("pass");
    expect(assessBodyFontSize(13).status).toBe("warn");
    expect(assessBodyFontSize(10).status).toBe("fail");
  });
});

describe("assessLineHeight", () => {
  it("flags tight line heights", () => {
    expect(assessLineHeight(1.5).status).toBe("pass");
    expect(assessLineHeight(1.15).status).toBe("warn");
    expect(assessLineHeight(1.05).status).toBe("fail");
  });
});

describe("assessScaleGrowth", () => {
  it("warns when the ratio grows quickly", () => {
    expect(assessScaleGrowth(1.25).status).toBe("pass");
    expect(assessScaleGrowth(1.8).status).toBe("warn");
  });
});

describe("assessStepCount", () => {
  it("warns when there are too many steps", () => {
    expect(assessStepCount(7).status).toBe("pass");
    expect(assessStepCount(15).status).toBe("warn");
  });
});

describe("assessRoleWeights", () => {
  const baseRole: RoleAssignment = {
    role: "body",
    step: 0,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacingPx: 0,
  };

  it("passes when every role has a valid font weight", () => {
    const result = assessRoleWeights([
      baseRole,
      { ...baseRole, role: "title", fontWeight: 600 },
    ]);
    expect(result.status).toBe("pass");
    expect(result.invalidRoles).toEqual([]);
  });

  it("fails and names roles with a missing or invalid font weight", () => {
    const result = assessRoleWeights([
      baseRole,
      { ...baseRole, role: "title", fontWeight: Number.NaN },
    ]);
    expect(result.status).toBe("fail");
    expect(result.invalidRoles).toEqual(["title"]);
  });
});
