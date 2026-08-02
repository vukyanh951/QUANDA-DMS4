import { describe, expect, it } from "vitest";
import {
  extractYouTubeVideoId,
  fillTutorialIds,
  matchTutorialsForStage,
  resolveTutorialRecommendations,
  tutorials,
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
  it("contains direct YouTube videos only", () => {
    expect(tutorials).toHaveLength(24);
    expect(
      tutorials.every(
        (tutorial) =>
          tutorial.sourceType === "video" &&
          extractYouTubeVideoId(tutorial.url) === tutorial.youtubeVideoId,
      ),
    ).toBe(true);
    expect(extractYouTubeVideoId("https://www.youtube.com/results?search_query=blender"))
      .toBeNull();
    expect(extractYouTubeVideoId("https://example.com/watch?v=ILqOWe3zAbk"))
      .toBeNull();
  });

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

  it("replaces an AI-selected video when it belongs to another application", () => {
    const ids = fillTutorialIds(
      { ...stage, tutorialIds: ["figma-auto-layout"] },
      "en",
    );

    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id.startsWith("blender-"))).toBe(true);
  });

  it("does not create search links when no verified video matches", () => {
    const unsupportedStage = {
      ...stage,
      applicationId: "premiere-pro",
      tutorialIds: [],
    };

    expect(resolveTutorialRecommendations(unsupportedStage, "en", "en"))
      .toEqual([]);
  });

  it("returns a YouTube thumbnail and direct watch action data", () => {
    const [recommendation] = resolveTutorialRecommendations(stage, "en", "en");

    expect(recommendation.badge).toBe("youtube");
    expect(recommendation.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
    expect(recommendation.thumbnailUrl).toBe(
      `https://i.ytimg.com/vi/${extractYouTubeVideoId(recommendation.url)}/hqdefault.jpg`,
    );
  });
});
