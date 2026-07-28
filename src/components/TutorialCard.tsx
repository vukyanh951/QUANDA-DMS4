"use client";

import { ArrowUpRight, BookOpen, Clock3 } from "lucide-react";
import type { Translation } from "@/src/i18n/translations";
import type { TutorialRecommendation } from "@/src/lib/tutorialMatcher";
import { trackEvent } from "@/src/lib/analytics";

interface TutorialCardProps {
  tutorial: TutorialRecommendation;
  t: Translation;
}

export function TutorialCard({ tutorial, t }: TutorialCardProps) {
  return (
    <article className="tutorial-card">
      <div className="tutorial-topline">
        <span className={`source-badge badge-${tutorial.badge}`}>
          {tutorial.badge === "curated" ? t.results.curated : t.results.searchSuggestion}
        </span>
        <BookOpen aria-hidden="true" size={16} />
      </div>
      <h5>{tutorial.title}</h5>
      <p>{tutorial.creator}</p>
      <dl>
        <div>
          <dt>{t.results.application}</dt>
          <dd>{tutorial.applicationName}</dd>
        </div>
        <div>
          <dt>{t.results.learning}</dt>
          <dd>{t.results.level[tutorial.level]}</dd>
        </div>
        <div>
          <dt>{t.form.tutorialLanguage}</dt>
          <dd>{t.results.languageNames[tutorial.language]}</dd>
        </div>
        <div>
          <dt><Clock3 aria-hidden="true" size={12} /></dt>
          <dd>
            {tutorial.durationMinutes
              ? `${tutorial.durationMinutes} ${t.results.minutes}`
              : t.results.durationUnknown}
          </dd>
        </div>
      </dl>
      <a
        className="tutorial-link"
        href={tutorial.url}
        onClick={() =>
          trackEvent("tutorial_opened", {
            tutorialId: tutorial.id,
            source: tutorial.badge,
          })
        }
        rel="noreferrer"
        target="_blank"
      >
        {t.results.openTutorial}
        <ArrowUpRight aria-hidden="true" size={15} />
      </a>
    </article>
  );
}
