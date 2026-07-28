import tutorialsData from "@/src/data/tutorials.json";
import { applicationById } from "@/src/data/applications";
import type {
  Locale,
  RoadmapRequest,
  RoadmapStage,
  TutorialLanguage,
} from "@/src/types";

export interface Tutorial {
  id: string;
  title: Record<Locale, string>;
  creator: string;
  url: string;
  language: Locale;
  applicationId: string;
  topics: string[];
  level: "beginner" | "intermediate" | "advanced";
  durationMinutes: number | null;
  verifiedAt: string;
  sourceType: "video" | "article" | "course";
}

export interface TutorialRecommendation {
  id: string;
  title: string;
  creator: string;
  url: string;
  language: Locale;
  applicationName: string;
  level: Tutorial["level"];
  durationMinutes: number | null;
  sourceType: Tutorial["sourceType"];
  badge: "curated" | "search";
}

export const tutorials = tutorialsData as Tutorial[];

const tutorialById = new Map(tutorials.map((tutorial) => [tutorial.id, tutorial]));

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function languageMatches(
  tutorial: Tutorial,
  preference: TutorialLanguage,
): boolean {
  return preference === "either" || tutorial.language === preference;
}

export function validateTutorialIds(ids: string[]): string[] {
  return [...new Set(ids)].filter((id) => tutorialById.has(id));
}

export function selectCandidateTutorials(
  request: RoadmapRequest,
  limit = 16,
): Tutorial[] {
  const requestTokens = new Set(
    tokenize(
      `${request.projectBrief} ${request.currentExperience} ${request.outputType}`,
    ),
  );
  const requiredApplications = new Set(request.requiredApplications);

  return tutorials
    .filter((tutorial) => languageMatches(tutorial, request.tutorialLanguage))
    .map((tutorial) => {
      let score = 0;
      if (requiredApplications.has(tutorial.applicationId)) score += 8;
      for (const topic of tutorial.topics) {
        for (const token of tokenize(topic)) {
          if (requestTokens.has(token)) score += 2;
        }
      }
      if (tutorial.level === "beginner") score += 1;
      return { tutorial, score };
    })
    .sort((a, b) => b.score - a.score || a.tutorial.id.localeCompare(b.tutorial.id))
    .slice(0, limit)
    .map(({ tutorial }) => tutorial);
}

export function matchTutorialsForStage(
  stage: RoadmapStage,
  preference: TutorialLanguage,
  limit = 3,
): Tutorial[] {
  const stageTokens = new Set(
    tokenize(`${stage.title} ${stage.goal} ${stage.skillToLearn} ${stage.tasks.join(" ")}`),
  );

  return tutorials
    .filter((tutorial) => languageMatches(tutorial, preference))
    .map((tutorial) => {
      let score = tutorial.applicationId === stage.applicationId ? 10 : 0;
      for (const topic of tutorial.topics) {
        for (const token of tokenize(topic)) {
          if (stageTokens.has(token)) score += 2;
        }
      }
      return { tutorial, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.tutorial.id.localeCompare(b.tutorial.id))
    .slice(0, limit)
    .map(({ tutorial }) => tutorial);
}

export function fillTutorialIds(
  stage: RoadmapStage,
  preference: TutorialLanguage,
): string[] {
  const valid = validateTutorialIds(stage.tutorialIds);
  if (valid.length >= 1) return valid.slice(0, 3);
  return matchTutorialsForStage(stage, preference).map((tutorial) => tutorial.id);
}

export function resolveTutorialRecommendations(
  stage: RoadmapStage,
  preference: TutorialLanguage,
  locale: Locale,
): TutorialRecommendation[] {
  const validIds = fillTutorialIds(stage, preference);
  const curated = validIds
    .map((id) => tutorialById.get(id))
    .filter((tutorial): tutorial is Tutorial => Boolean(tutorial))
    .map((tutorial) => ({
      id: tutorial.id,
      title: tutorial.title[locale],
      creator: tutorial.creator,
      url: tutorial.url,
      language: tutorial.language,
      applicationName:
        applicationById[tutorial.applicationId]?.name ?? tutorial.applicationId,
      level: tutorial.level,
      durationMinutes: tutorial.durationMinutes,
      sourceType: tutorial.sourceType,
      badge: "curated" as const,
    }));

  if (curated.length > 0) return curated;

  const applicationName = stage.applicationId
    ? applicationById[stage.applicationId]?.name ?? stage.applicationId
    : "";
  const requestedLanguage =
    preference === "vi"
      ? "Vietnamese"
      : preference === "en"
        ? "English"
        : "";
  const query = [
    applicationName,
    "beginner",
    stage.skillToLearn,
    "tutorial",
    requestedLanguage,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    {
      id: `search-${stage.id}`,
      title:
        locale === "en"
          ? `Search for: ${query}`
          : `Tìm kiếm: ${query}`,
      creator: "YouTube",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      language: preference === "vi" ? "vi" : "en",
      applicationName: applicationName || "—",
      level: "beginner",
      durationMinutes: null,
      sourceType: "video",
      badge: "search",
    },
  ];
}
