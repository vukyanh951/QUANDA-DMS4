import { describe, expect, it } from "vitest";
import {
  matchTutorialsForStage,
  validateTutorialIds,
} from "@/src/lib/tutorialMatcher";
import type { RoadmapStage } from "@/src/types";

const stage: RoadmapStage = {
  id: "model",
  order: 1,
  title: "Model a simple product",
  goal: "Create clean hard-surface geometry in Blender.",
  why: "The model is the foundation of the animation.",
  applicationId: "blender",
  skillToLearn: "Beginner Blender modelling",
  tasks: ["Block the silhouette", "Refine the geometry"],
  learningMinutes: 60,
  productionMinutes: 120,
  dependsOnStageIds: [],
  tutorialIds: [],
};

describe("tutorial catalogue matching", () => {
  it("keeps only unique catalogue IDs", () => {
    expect(
      validateTutorialIds([
        "blender-navigation",
        "not-in-the-catalogue",
        "blender-navigation",
      ]),
    ).toEqual(["blender-navigation"]);
  });

  it("falls back to deterministic catalogue matches for a stage", () => {
    const matches = matchTutorialsForStage(stage, "en");

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(3);
    expect(matches.every((tutorial) => tutorial.applicationId === "blender")).toBe(true);
    expect(
      matchTutorialsForStage(stage, "en").map((tutorial) => tutorial.id),
    ).toEqual(matches.map((tutorial) => tutorial.id));
  });
});
