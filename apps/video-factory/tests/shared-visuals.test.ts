/**
 * Locks the project's most critical rule: every CEFR level reuses the topic's
 * single shared image-manifest. Level packages must NOT be able to carry their
 * own images/scenes.
 */

import { describe, expect, it } from "vitest";

import { validate } from "../src/core/validators.js";
import {
  DEFAULT_LEVELS,
  buildLevelPackage,
  buildTopicPackage,
  buildVisualScenes,
} from "../src/testing/fixtures.js";

const FORBIDDEN_VISUAL_KEYS = ["images", "image_urls", "scenes", "imageManifest", "visualScenes"];

describe("level-package never carries its own visuals (tamper test)", () => {
  const topicId = "ordering-coffee";
  const scenes = buildVisualScenes(topicId);
  const validLevel = buildLevelPackage(topicId, "A1", scenes);

  it("a clean level-package is valid", () => {
    const result = validate("level-package", validLevel);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // The critical assertion: injecting any visual-bearing field must fail validation.
  it.each(FORBIDDEN_VISUAL_KEYS)("rejects a level-package tampered with a '%s' field", (key) => {
    const tampered = {
      ...structuredClone(validLevel),
      [key]: [
        { sceneId: "scene-1", imageRef: "https://example.com/rogue-A1.png" },
      ],
    };

    const result = validate("level-package", tampered);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("topic-package shares one image-manifest across all levels (structure test)", () => {
  const pkg = buildTopicPackage({ levels: DEFAULT_LEVELS });

  it("is schema-valid", () => {
    const result = validate("topic-package", pkg);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("has exactly one shared visualScenes manifest", () => {
    expect(pkg.visualScenes).toBeDefined();
    expect(Array.isArray(pkg.visualScenes.scenes)).toBe(true);
    expect(pkg.visualScenes.scenes.length).toBeGreaterThan(0);
  });

  it("produces one package per requested level", () => {
    expect(pkg.levels).toHaveLength(DEFAULT_LEVELS.length);
    expect(pkg.levels.map((l) => l.level)).toEqual(DEFAULT_LEVELS);
  });

  it("no level carries its own scene/image fields", () => {
    for (const level of pkg.levels) {
      for (const key of FORBIDDEN_VISUAL_KEYS) {
        expect(Object.hasOwn(level, key)).toBe(false);
      }
    }
  });

  it("every level references only sceneIds from the shared manifest", () => {
    const manifestSceneIds = new Set(pkg.visualScenes.scenes.map((s) => s.sceneId));
    for (const level of pkg.levels) {
      for (const line of level.script.lines) {
        expect(manifestSceneIds.has(line.sceneId)).toBe(true);
      }
    }
  });
});
