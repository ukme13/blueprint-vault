import { describe, expect, it } from "vitest";
import { normalizeStoredSystem } from "./migrate";
import {
  applyTypeRolePreset,
  detectTypeRolePreset,
  TYPE_ROLE_PRESETS,
  type TypeRolePresetId,
} from "./role-presets";
import {
  defaultGroups,
  defaultSystem,
  elementForRole,
  groupCapacity,
  roleIdsForGroup,
  type TypeSystem,
} from "./system";

const system = () => defaultSystem("Scale", ["Inter"], 16, 1.25, 9);
const ids = (next: TypeSystem) => next.roles.map((role) => role.id);
const PRESET_IDS = TYPE_ROLE_PRESETS.map((preset) => preset.id);

describe("type role presets", () => {
  it("are App UI, Minimal and Editorial, and a new system is Minimal", () => {
    expect(PRESET_IDS).toEqual(["app-ui", "minimal", "editorial"]);
    expect(detectTypeRolePreset(system())).toBe("minimal");
  });

  it("build App UI's roles in their groups", () => {
    const next = applyTypeRolePreset(system(), "app-ui");
    expect(next.groups.map((group) => group.id)).toEqual([
      "display",
      "h",
      "body",
      "button",
      "chip",
      "label",
      "caption",
      "code",
    ]);
    expect(ids(next)).toEqual([
      "display",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "body-md",
      "body-sm",
      "body-xs",
      "button-md",
      "button-sm",
      "button-xs",
      "chip",
      "label",
      "caption",
      "code",
    ]);
    const role = (id: string) => next.roles.find((each) => each.id === id)!;
    expect(role("button-md")).toMatchObject({ stepOffset: 0, fontWeight: 600 });
    expect(role("button-xs")).toMatchObject({
      stepOffset: -2,
      fontWeight: 500,
    });
    expect(role("body-md").stepOffset).toBe(1);
  });

  it("build Editorial's roles, with an uppercase overline", () => {
    const next = applyTypeRolePreset(system(), "editorial");
    expect(ids(next)).toEqual([
      "display-1",
      "display-2",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "body-md",
      "body-sm",
      "body-xs",
      "label",
      "quote",
      "caption",
      "overline",
    ]);
    const overline = next.roles.find((role) => role.id === "overline")!;
    expect(overline.textTransform).toBe("uppercase");
    expect(elementForRole(next, overline)).toBe("span");
  });

  it("give every preset valid groups: known, within capacity, named by the rule", () => {
    for (const id of PRESET_IDS) {
      const next = applyTypeRolePreset(system(), id);
      const groupIds = next.groups.map((group) => group.id);
      /* The groups a load always restores. */
      for (const fixed of defaultGroups()) expect(groupIds).toContain(fixed.id);
      expect(new Set(groupIds).size).toBe(groupIds.length);
      expect(new Set(ids(next)).size).toBe(next.roles.length);
      for (const group of next.groups) {
        const members = next.roles.filter((role) => role.groupId === group.id);
        expect(members.length).toBeGreaterThan(0);
        expect(members.length).toBeLessThanOrEqual(groupCapacity(group));
        expect(members.map((role) => role.id)).toEqual(
          roleIdsForGroup(group, members.length),
        );
      }
      for (const role of next.roles) {
        expect(role.stepOffset).toBeGreaterThanOrEqual(-2);
        expect(role.stepOffset).toBeLessThanOrEqual(6);
      }
    }
  });

  it("keep the fonts, base size, ratio and step count", () => {
    const base = {
      ...system(),
      baseFontSizePx: 18,
      ratio: 1.333,
      stepCount: 10,
    };
    for (const id of PRESET_IDS) {
      const next = applyTypeRolePreset(base, id);
      expect(next.fonts).toBe(base.fonts);
      expect(next).toMatchObject({
        name: base.name,
        baseFontSizePx: 18,
        ratio: 1.333,
        stepCount: 10,
      });
    }
  });

  it("point roles at the first font when the system lost the one they ask for", () => {
    const oneFont = {
      ...system(),
      fonts: system().fonts.filter((font) => font.id === "main"),
    };
    const next = applyTypeRolePreset(oneFont, "editorial");
    expect(new Set(next.roles.map((role) => role.fontId))).toEqual(
      new Set(["main"]),
    );
  });

  it("are recognised after a save and a reload", () => {
    for (const id of PRESET_IDS) {
      const applied = applyTypeRolePreset(system(), id);
      const reloaded = normalizeStoredSystem(
        JSON.parse(JSON.stringify(applied)),
      );
      expect(reloaded && detectTypeRolePreset(reloaded)).toBe(id);
    }
  });

  it("read as custom once a role, a group or a size changes", () => {
    const appUi = applyTypeRolePreset(system(), "app-ui");
    const edits: Array<[string, TypeSystem]> = [
      [
        "weight",
        {
          ...appUi,
          roles: appUi.roles.map((role) =>
            role.id === "chip" ? { ...role, fontWeight: 700 } : role,
          ),
        },
      ],
      [
        "hand-set size",
        {
          ...appUi,
          roles: appUi.roles.map((role) =>
            role.id === "h1"
              ? { ...role, unlinkedSizes: { desktop: 40 } }
              : role,
          ),
        },
      ],
      ["removed role", { ...appUi, roles: appUi.roles.slice(1) }],
      [
        "renamed group",
        {
          ...appUi,
          groups: appUi.groups.map((group) =>
            group.id === "chip" ? { ...group, label: "Tag" } : group,
          ),
        },
      ],
    ];
    for (const [, edited] of edits) {
      expect(detectTypeRolePreset(edited)).toBe("custom");
    }
  });

  it("switch between presets and back", () => {
    const sequence: TypeRolePresetId[] = ["app-ui", "editorial", "minimal"];
    let next = system();
    for (const id of sequence) {
      next = applyTypeRolePreset(next, id);
      expect(detectTypeRolePreset(next)).toBe(id);
    }
    /* Minimal as the naming rule gives it: a lone display role is
       `display`, which is what the seed's `display-1` becomes on a load. */
    expect(ids(next)).toEqual(
      system().roles.map((role) =>
        role.id === "display-1" ? "display" : role.id,
      ),
    );
  });
});
