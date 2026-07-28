"use client";

import { ArrowDown, ArrowRight, BookOpenCheck, ListChecks, PencilLine } from "lucide-react";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { getTranslation } from "@/src/i18n/translations";
import type { Locale, RoadmapRequest, RoadmapResponse } from "@/src/types";
import { ProjectBriefForm } from "./ProjectBriefForm";
import { RoadmapResults } from "./RoadmapResults";
import { createSampleRoadmap } from "@/src/data/sampleRoadmaps";
import { LoadingRoadmap } from "./LoadingRoadmap";
import {
  clearProjectStorage,
  readCompletion,
  readDraft,
  readLanguage,
  readRoadmap,
  writeCompletion,
  writeDraft,
  writeLanguage,
  writeRoadmap,
} from "@/src/lib/storage";
import { RoadmapResponseSchema } from "@/src/schemas/roadmapResponse";
import { trackEvent } from "@/src/lib/analytics";
const stepIcons = [PencilLine, ListChecks, BookOpenCheck] as const;

function dateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function emptyForm(locale: Locale): RoadmapRequest {
  return {
    interfaceLanguage: locale,
    projectBrief: "",
    deadline: dateFromToday(7),
    currentExperience: "",
    hoursPerDay: 2,
    daysPerWeek: 6,
    tutorialLanguage: "either",
    requiredApplications: [],
    outputType: "video",
    targetQuality: "unsure",
  };
}

interface QuandaAppProps {
  demoMode: boolean;
}

export function QuandaApp({ demoMode }: QuandaAppProps) {
  const [locale, setLocale] = useState<Locale>("en");
  const [form, setForm] = useState<RoadmapRequest>(() => emptyForm("en"));
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [completion, setCompletion] = useState<Record<string, string[]>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = getTranslation(locale);
  const completedStageIds = roadmap ? completion[roadmap.id] ?? [] : [];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedLocale = readLanguage(window.localStorage);
      const savedDraft = readDraft(window.localStorage);
      const savedRoadmap = readRoadmap(window.localStorage);
      const restoredLocale =
        savedLocale ?? savedDraft?.interfaceLanguage ?? savedRoadmap?.language ?? "en";

      setLocale(restoredLocale);
      setForm(
        savedDraft
          ? { ...savedDraft, interfaceLanguage: restoredLocale }
          : emptyForm(restoredLocale),
      );
      setRoadmap(savedRoadmap);
      setCompletion(readCompletion(window.localStorage));
      setIsHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (isHydrated) writeLanguage(window.localStorage, locale);
  }, [isHydrated, locale]);

  useEffect(() => {
    if (!isHydrated) return;
    const timeout = window.setTimeout(
      () => writeDraft(window.localStorage, form),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [form, isHydrated]);

  useEffect(() => {
    if (isHydrated && roadmap) {
      writeRoadmap(window.localStorage, roadmap);
    }
  }, [isHydrated, roadmap]);

  useEffect(() => {
    if (isHydrated) {
      writeCompletion(window.localStorage, completion);
    }
  }, [completion, isHydrated]);

  const changeLanguage = (nextLocale: Locale) => {
    setLocale(nextLocale);
    trackEvent("language_changed", { language: nextLocale });
    const nextForm = { ...form, interfaceLanguage: nextLocale };
    setForm(nextForm);
    if (roadmap?.source === "demo") {
      setRoadmap(createSampleRoadmap(nextForm));
    }
  };

  const scrollToForm = () => {
    document.querySelector("#project-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const loadExample = () => {
    const nextForm: RoadmapRequest = {
      ...emptyForm(locale),
      projectBrief:
        locale === "en"
          ? "I need to create a 20-second product animation for a university assignment. I know Photoshop at an intermediate level, but I have never used Blender. The project is due in seven days. The final output should be a 1080p MP4 with simple sound."
          : "Tôi cần làm một video hoạt hình sản phẩm dài 20 giây cho bài tập đại học. Tôi sử dụng Photoshop ở mức trung cấp nhưng chưa từng dùng Blender. Dự án phải hoàn thành trong bảy ngày. Sản phẩm cuối là video MP4 1080p có âm thanh đơn giản.",
      currentExperience:
        locale === "en"
          ? "Photoshop: intermediate; Blender: complete beginner"
          : "Photoshop: trung cấp; Blender: chưa từng sử dụng",
      requiredApplications: ["blender"],
      outputType: "video",
      targetQuality: "basic",
    };
    setForm(nextForm);
    setRoadmap(null);
    setError(null);
    requestAnimationFrame(scrollToForm);
  };

  const generateRoadmap = async (request: RoadmapRequest) => {
    setForm(request);
    setIsLoading(true);
    setError(null);
    setRoadmap(null);
    trackEvent("roadmap_generate_started", {
      language: request.interfaceLanguage,
      outputType: request.outputType,
    });
    requestAnimationFrame(() => {
      document.querySelector("#roadmap-loading")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    let generatedRoadmap: RoadmapResponse | null = null;
    const requestTranslation = getTranslation(request.interfaceLanguage);
    try {
      const apiResponse = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (apiResponse.status === 429) {
        setError(requestTranslation.errors.rateLimit);
        return;
      }
      if (!apiResponse.ok) {
        setError(requestTranslation.errors.api);
        return;
      }

      const parsed = RoadmapResponseSchema.safeParse(await apiResponse.json());
      if (!parsed.success) {
        generatedRoadmap = {
          ...createSampleRoadmap(request),
          source: "fallback",
          notice: requestTranslation.errors.malformedFallback,
        };
      } else {
        generatedRoadmap = parsed.data;
      }
    } catch (caughtError) {
      generatedRoadmap = {
        ...createSampleRoadmap(request),
        source: "fallback",
        notice:
          caughtError instanceof DOMException && caughtError.name === "AbortError"
            ? requestTranslation.errors.timeoutFallback
            : requestTranslation.errors.networkFallback,
      };
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
      if (generatedRoadmap) {
        const finalRoadmap = generatedRoadmap;
        setRoadmap(finalRoadmap);
        setCompletion((current) => ({
          ...current,
          [finalRoadmap.id]: [],
        }));
        trackEvent(
          finalRoadmap.source === "fallback"
            ? "roadmap_generate_fallback"
            : "roadmap_generate_succeeded",
          {
            source: finalRoadmap.source ?? "ai",
            stageCount: finalRoadmap.stages.length,
          },
        );
        window.setTimeout(() => {
          document.querySelector("#roadmap-results")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 50);
      }
    }
  };

  const toggleStage = (stageId: string) => {
    if (!roadmap) return;
    setCompletion((current) => {
      const roadmapCompletion = current[roadmap.id] ?? [];
      const isCompleting = !roadmapCompletion.includes(stageId);
      if (isCompleting) {
        trackEvent("stage_completed", { roadmapId: roadmap.id, stageId });
      }
      return {
        ...current,
        [roadmap.id]: isCompleting
          ? [...roadmapCompletion, stageId]
          : roadmapCompletion.filter((id) => id !== stageId),
      };
    });
  };

  return (
    <main id="top">
      <div className="page-shell">
        <Header
          isReady={isHydrated}
          locale={locale}
          t={t}
          onLanguageChange={changeLanguage}
          onLoadExample={loadExample}
        />

        <section className="hero" aria-labelledby="hero-title">
          <div className="route-motif" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <h1 id="hero-title">
            {t.hero.titleLead} <em>{t.hero.titleAccent}</em>
          </h1>
          <p className="hero-tagline">{t.hero.tagline}</p>
          <p className="hero-description">{t.hero.description}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={scrollToForm} type="button">
              {t.hero.start}
              <ArrowDown aria-hidden="true" size={17} />
            </button>
            <span>{t.hero.note}</span>
          </div>
        </section>

        <section className="how-section" id="how-it-works" aria-labelledby="how-title">
          <div className="section-heading">
            <p className="eyebrow">{t.how.eyebrow}</p>
            <h2 id="how-title">{t.how.title}</h2>
          </div>
          <ol className="steps">
            {t.how.steps.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <li key={step.title}>
                  <span className="step-number">0{index + 1}</span>
                  <span className="step-icon" aria-hidden="true">
                    <Icon size={21} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {index < t.how.steps.length - 1 && (
                    <ArrowRight className="step-arrow" aria-hidden="true" size={20} />
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <ProjectBriefForm
          demoMode={demoMode}
          isSubmitting={isLoading || !isHydrated}
          onChange={setForm}
          onSubmit={generateRoadmap}
          t={t}
          value={form}
        />

        <div aria-live="polite">
          {isLoading && <LoadingRoadmap t={t} />}
          {error && (
            <div className="api-error" role="alert">
              <strong>{t.form.errorsTitle}</strong>
              <p>{error}</p>
            </div>
          )}
        </div>

        {roadmap && (
          <RoadmapResults
            completedStageIds={completedStageIds}
            onEdit={scrollToForm}
            onRegenerate={() => {
              trackEvent("roadmap_regenerated");
              void generateRoadmap(form);
            }}
            onStartOver={() => {
              if (!window.confirm(t.results.startOverConfirm)) return;
              clearProjectStorage(window.localStorage);
              setForm(emptyForm(locale));
              setRoadmap(null);
              setCompletion({});
              setError(null);
              writeLanguage(window.localStorage, locale);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onToggleStage={toggleStage}
            roadmap={roadmap}
            t={t}
            tutorialLanguage={form.tutorialLanguage}
          />
        )}

        <footer>
          <a className="brand footer-brand" href="#top">QUANDA</a>
          <p>{t.hero.tagline}</p>
          <span>© {new Date().getFullYear()} QUANDA</span>
        </footer>
      </div>
    </main>
  );
}
