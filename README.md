# QUANDA

QUANDA turns a creative project brief, deadline, current experience, and weekly availability into a practical 4–8 stage learning and production roadmap. It supports English and Vietnamese, matches stages to a verified local tutorial catalogue, and stays demonstrable without an AI key.

## 1. Product overview

The app is designed for students and early-career creatives who need to learn unfamiliar tools while finishing a real deliverable. It provides:

- Deadline-aware feasibility guidance and time estimates
- Ordered learning and production tasks
- Curated tutorial recommendations
- English and Vietnamese interface modes
- Saved drafts, roadmap progress, and stage completion in the browser
- Optional Qwen-generated roadmaps with a deterministic demo fallback

## 2. MVP scope

This repository contains the proposal-ready MVP only: one responsive planning flow, the server-side roadmap endpoint, local tutorial data, validation, persistence, accessibility states, and deployment configuration. QUANDA is not a chatbot, account system, collaboration tool, or learning-management platform.

## 3. Screenshots

> Screenshot placeholder: add final desktop and mobile screenshots after the public deployment URL is confirmed.

The generated social preview is available at `public/quanda-social-card.png`.

## 4. Local installation

Requirements: Node.js 22.13 or newer and pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm run dev
```

Open `http://localhost:3000`.

## 5. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DASHSCOPE_API_KEY` | No | Server-only Alibaba Cloud Model Studio API key. With no key, QUANDA uses demo mode. |
| `QWEN_BASE_URL` | No | OpenAI-compatible Model Studio endpoint. Defaults to the international Singapore endpoint. |
| `QWEN_MODEL` | No | Model name. Defaults to `qwen3.5-flash`. |
| `QWEN_ENABLE_THINKING` | No | Set to `true` to enable supported thinking mode; defaults to `false`. |
| `NEXT_PUBLIC_APP_URL` | No | Public app origin for local documentation and deployment configuration. |

Never prefix the DashScope key with `NEXT_PUBLIC_` and never place it in client-side code. `.env.local` is ignored by Git.

## 6. Qwen Model Studio setup

1. Create or sign in to an Alibaba Cloud account with Model Studio available in the intended region.
2. Enable Model Studio access and create an API key in its console.
3. Choose the OpenAI-compatible base URL for the same region as the key.
4. Copy `.env.example` to `.env.local` and set `DASHSCOPE_API_KEY`.
5. Keep `QWEN_MODEL=qwen3.5-flash`, or change it only to a compatible model available to the account.
6. Restart the development server.

The default international endpoint is:

```text
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

API access, models, quotas, regional availability, and billing depend on the Alibaba Cloud Model Studio account. QUANDA does not assume that Qwen usage is free.

The browser sends only the validated roadmap request to `/api/roadmap`. The server route reads the key, calls Model Studio, validates the JSON, attempts one repair when necessary, and returns normalized data. The key is never included in browser code or API responses.

## 7. Demo mode

When `DASHSCOPE_API_KEY` is absent, `/api/roadmap` returns a deterministic roadmap based on the project type. The UI labels this as demo mode. If a configured AI request times out, fails, or returns invalid JSON after one repair attempt, QUANDA returns the same safe fallback shape with a bilingual notice.

## 8. Add tutorials

Edit `src/data/tutorials.json`. Each entry needs:

- A unique `id`
- English and Vietnamese display titles
- Creator, verified URL, and content language
- A supported `applicationId`
- Search topics, level, duration, verification date, and source type

Only catalogue IDs may be rendered as curated links. If no catalogue item matches, QUANDA creates a clearly labelled YouTube search suggestion rather than inventing a tutorial URL. Verify every new link before committing it.

## 9. Add translations

Edit `src/i18n/translations.ts`. Add the same key to both the `en` and `vi` objects, then use the typed translation object in the relevant component. Keep loading, validation, timeout, and fallback messages bilingual.

## 10. Test commands

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run build
```

Run the complete check sequence with:

```bash
pnpm run test:all
```

`npm run build` executes the same production build script and is the Vercel compatibility check.

## 11. Vercel deployment

1. Push this repository to GitHub.
2. Import the repository into Vercel and keep the detected Next.js framework preset.
3. Add `DASHSCOPE_API_KEY` as a server environment variable.
4. Add the region-matching `QWEN_BASE_URL`.
5. Add `QWEN_MODEL=qwen3.5-flash`.
6. Optionally add `QWEN_ENABLE_THINKING=false` and `NEXT_PUBLIC_APP_URL` with the public origin.
7. Deploy and test the public URL in English and Vietnamese.
8. Temporarily test without the API key, or with the upstream service unavailable, to confirm demo and fallback behaviour.

The server endpoint uses bounded request sizes, a short in-memory rate limit, and request timeouts; it does not start background jobs.

## 12. Known limitations

- Browser persistence is device-local and has no account sync.
- The in-memory rate limit is best-effort and is not shared across server instances.
- The catalogue is intentionally small and covers the applications required by this MVP.
- AI output quality depends on the selected Qwen model and account availability.
- Feasibility estimates are planning guidance, not guarantees.
- The demo templates cover Blender, Figma, and DaVinci Resolve project patterns.

## 13. Future features

- Cloud-synced projects and accounts
- Instructor feedback and shared roadmaps
- A larger, periodically re-verified tutorial catalogue
- Privacy-conscious production analytics
- Export to calendar or printable project plan
