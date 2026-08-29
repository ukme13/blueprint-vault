import { describe, expect, it } from "vitest";
import {
  assessBodyFontSize,
  assessLineHeight,
  hasThaiScript,
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

describe("assessLineHeight, by script", () => {
  const THAI = "ออกแบบด้วยความชัดเจน";
  const LATIN = "How vexingly quick daft zebras jump";

  describe("hasThaiScript", () => {
    it("finds Thai, and does not find it in Latin", () => {
      expect(hasThaiScript(THAI)).toBe(true);
      expect(hasThaiScript(LATIN)).toBe(false);
    });

    it("finds Thai inside mixed copy", () => {
      expect(hasThaiScript(`Blueprint ${THAI}`)).toBe(true);
    });

    it("treats empty text as Latin rather than guessing", () => {
      expect(hasThaiScript("")).toBe(false);
    });
  });

  it("keeps the Latin thresholds when the specimen is Latin", () => {
    expect(assessLineHeight(1.3, LATIN).status).toBe("pass");
    expect(assessLineHeight(1.15, LATIN).status).toBe("warn");
    expect(assessLineHeight(1.05, LATIN).status).toBe("fail");
  });

  it("raises the minimum for Thai", () => {
    // 1.3 is comfortable for Latin and not enough for Thai.
    expect(assessLineHeight(1.3, LATIN).status).toBe("pass");
    expect(assessLineHeight(1.3, THAI).status).toBe("warn");
  });

  it("fails Thai at a leading Latin only warns about", () => {
    expect(assessLineHeight(1.15, LATIN).status).toBe("warn");
    expect(assessLineHeight(1.15, THAI).status).toBe("fail");
  });

  it("takes the stricter threshold for mixed text", () => {
    // The Thai marks still have to fit, whatever else is in the line.
    const mixed = assessLineHeight(1.3, `Blueprint ${THAI}`);
    expect(mixed.status).toBe("warn");
    expect(mixed.script).toBe("thai");
  });

  it("names the script that raised the minimum", () => {
    const thai = assessLineHeight(1.3, THAI);
    expect(thai.script).toBe("thai");
    expect(thai.minLineHeight).toBe(1.4);
    expect(thai.summary).toContain("Thai");

    const latin = assessLineHeight(1.15, LATIN);
    expect(latin.script).toBeNull();
    expect(latin.minLineHeight).toBe(1.2);
    expect(latin.summary).not.toContain("Thai");
  });

  it("says Thai has room when it does", () => {
    const result = assessLineHeight(1.5, THAI);
    expect(result.status).toBe("pass");
    expect(result.summary).toContain("Thai");
  });

  it("applies Latin rules when no specimen is given", () => {
    // The parameter is optional, so an older caller keeps its behaviour.
    expect(assessLineHeight(1.3).status).toBe("pass");
    expect(assessLineHeight(1.3).script).toBeNull();
  });
});
