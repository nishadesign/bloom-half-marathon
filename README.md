# Bloom — Half Marathon Companion

A multi-user training journal that turns Strava activity, a prescribed half-marathon plan, and daily meal logs into one editorial weekly view. Built with Next.js 16, Prisma 7, and Postgres.

> *Know what works · Track together · Perform better.*

## What it does

- **Weekly plan** — pulls from a prescribed 18-week half-marathon block (`lib/prescribed-plan.ts`), fills in cross-training and rest days, and computes per-day calorie + macro targets via Mifflin–St Jeor (`lib/nutrition.ts`, `lib/targets.ts`).
- **Strava sync** — OAuth connect, auto-sync every 5 minutes on dashboard load, fetches activity detail (calories, description) for new runs.
- **Meal logging** — log from a curated meal library (`prisma/seed-meals.ts`) with portion multipliers; tallies daily macros against targets.
- **Adherence heatmap** — 12-week back-view that scores each day's workout + nutrition against the plan (`lib/adherence.ts`).
- **Plan rebuild** — regenerate the current week or rebuild the full arc on demand (`app/api/plan/*`).

The UI is documented in `design.md` (the Bloom design system — warm palette, Fraunces + Geist, Roman-numeral section markers).

## Tech stack

- **Framework:** Next.js 16 (App Router, React 19, server components + server actions)
- **DB:** Postgres via Prisma 7 (`@prisma/adapter-pg`)
- **Auth:** HMAC-signed cookie session keyed off Strava athlete ID (`lib/session.ts`)
- **Styling:** Tailwind v4 (`@theme` tokens in `app/globals.css`)
- **AI:** OpenAI client available (currently unused — plans are deterministic from the prescribed block)

## Project layout

```
app/
  api/
    meal-log/        log + edit meals for a date
    meals/           meal library
    plan/            regenerate · rebuild
    strava/          connect · callback · sync · fetch-calories
  components/        AdherenceHeatmap, MealLogger, DashboardActions, Logo
  generated/prisma/  Prisma client output (gitignored target)
  login/             Strava sign-in
  onboarding/        first-run profile + plan template
  plan/              weekly plan view
  page.tsx           dashboard (today's session, training, nutrition, heatmap)
lib/
  plan.ts            week generation + persistence
  prescribed-plan.ts 18-week block (Nisha / Vibhor templates)
  adherence.ts       workout + nutrition scoring
  auto-sync.ts       throttled Strava sync
  strava.ts          OAuth + activity API
  nutrition.ts       BMR/TDEE + macro targets
  targets.ts         daily macro target constants
  tz.ts              PT day/week boundaries
  session.ts         signed-cookie session
  db.ts              Prisma client singleton
prisma/
  schema.prisma      User · Activity · Plan · Meal · MealLog
  seed.ts            creates the default user
  seed-meals.ts      seeds the meal library
```

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure env

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql://...
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/api/strava/callback
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
SESSION_SECRET=  # any random string, >=16 chars
```

`SESSION_SECRET` is required by `lib/session.ts` — set it before first run.

### 3. Database

```bash
npx prisma migrate deploy           # apply migrations
npx tsx prisma/seed.ts              # create the default user
npx tsx prisma/seed-meals.ts        # seed the meal library
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login` to connect Strava, then through `/onboarding` on first run.

## Scripts

- `npm run dev` — Next dev server
- `npm run build` — `prisma generate && next build`
- `npm run start` — production server
- `postinstall` runs `prisma generate` automatically

## Notes for agents

- This repo pins **Next.js 16** — APIs and conventions differ from older training data. Read the relevant doc in `node_modules/next/dist/docs/` before adding routes, layouts, or fetch behavior. See `AGENTS.md`.
- Days are anchored to **PT** (`lib/tz.ts`); never use the local timezone directly.
- UI changes must follow `design.md` — use `.card`, `.btn-primary`, `.field`, `.display`, etc., not one-off classes.
- Prisma client output lives in `app/generated/prisma`; import from `@/lib/db`.
