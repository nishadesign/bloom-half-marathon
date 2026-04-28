import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildContext, getCurrentWeekPlan, type WeekPlan } from "@/lib/plan";
import { maybeAutoSync } from "@/lib/auto-sync";
import { computeAdherence } from "@/lib/adherence";
import { istDayStartUTC, istDayEndUTC, istDayShort } from "@/lib/tz";
import DashboardActions from "./components/DashboardActions";
import MealLogger from "./components/MealLogger";
import AdherenceHeatmap from "./components/AdherenceHeatmap";
import Logo from "./components/Logo";

const DAILY_TARGETS = {
  calories: 2278,
  protein: 160,
  carbs: 280,
  fat: 63,
};

function todayFromPlan(plan: WeekPlan | null) {
  if (!plan) return null;
  const today = istDayShort();
  return plan.days.find((d) => d.day === today) ?? null;
}

async function todaysTrainingSummary(userId: number) {
  const start = istDayStartUTC();
  const end = istDayEndUTC();

  const activities = await prisma.activity.findMany({
    where: { userId, startDate: { gte: start, lt: end } },
    orderBy: { startDate: "asc" },
  });

  const burned = activities.reduce((sum, a) => sum + (a.calories ?? 0), 0);
  return {
    count: activities.length,
    burnedKcal: Math.round(burned),
    sessions: activities.map((a) => ({
      name: a.name,
      sportType: a.sportType || a.type,
      km: +(a.distanceMeters / 1000).toFixed(2),
      minutes: Math.round(a.movingSeconds / 60),
      kcal: a.calories ? Math.round(a.calories) : null,
    })),
  };
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await prisma.user.findFirst();
  if (!user) {
    return (
      <main className="p-6">
        <p className="text-graphite">No user seeded. Run <code>npx tsx prisma/seed.ts</code>.</p>
      </main>
    );
  }

  const connected = !!user.stravaAccessToken;
  if (connected) await maybeAutoSync(user.id);
  const ctx = await buildContext(user.id);
  const training = await todaysTrainingSummary(user.id);
  const plan = await getCurrentWeekPlan(user.id);
  const todaySession = todayFromPlan(plan);
  const adherence = await computeAdherence(user.id, user.raceDate);

  return (
    <main className="min-h-screen text-obsidian">
      <div className="mx-auto max-w-[1120px] px-sm sm:px-md md:px-xl py-xl sm:py-2xl">
        {/* Masthead — logo + greeting */}
        <nav className="flex items-center justify-between mb-lg rise stagger-1">
          <div className="flex items-center gap-sm">
            <Logo />
            <span className="display text-[22px] sm:text-[26px] tracking-[-0.015em]">
              Hey {user.name}
            </span>
          </div>
          <DashboardActions connected={connected} />
        </nav>


        {todaySession && training.count === 0 && (
          <section className="mb-lg rise stagger-3">
            <div className="flex items-baseline justify-between gap-sm mb-md">
              <SectionHeader numeral="I" title="Today's session" />
            </div>
            <article className="card card-hover p-md sm:p-lg">
              <div className="flex items-baseline justify-between gap-sm flex-wrap mb-sm">
                <p className="display-italic text-[14px] text-sand-deep">
                  {todaySession.focus.replace(/_/g, " ")}
                </p>
                <p className="text-[13px] sm:text-[14px] text-smoke">
                  {todaySession.targetDistanceKm ? `${todaySession.targetDistanceKm} km` : ""}
                  {todaySession.durationMinutes ? ` · ${todaySession.durationMinutes} min` : ""}
                </p>
              </div>
              <p className="display text-[24px] sm:text-[30px] leading-[1.2] tracking-[-0.015em] text-ink">
                {todaySession.session}
              </p>
              {todaySession.coachNotes && (
                <>
                  <div className="rule my-md" />
                  <p className="display-italic text-[14px] sm:text-[15px] text-graphite">
                    {todaySession.coachNotes}
                  </p>
                </>
              )}
              <div className="rule my-md" />
              <Link
                href="/plan"
                className="display-italic text-[14px] text-sand-deep hover:text-ink transition-colors"
              >
                View the full week →
              </Link>
            </article>
          </section>
        )}

        {!todaySession && plan && (
          <section className="mb-lg rise stagger-3">
            <Link
              href="/plan"
              className="card card-hover p-md sm:p-lg block"
            >
              <p className="eyebrow mb-xs text-[14px]">Week {plan.weekNumber}</p>
              <p className="display text-[20px] sm:text-[22px] tracking-[-0.01em]">
                View the full week →
              </p>
            </Link>
          </section>
        )}

        <section className="mb-lg rise stagger-4">
          <AdherenceHeatmap grid={adherence} />
        </section>

        <section className="rise stagger-5">
          <SectionHeader numeral="III" title="Today" />
          <MealLogger targets={DAILY_TARGETS} training={training} />
        </section>

        <footer className="mt-2xl pt-lg">
          <div className="rule mb-md" />
          <p className="eyebrow text-center text-[14px] italic">Know what works · Track together · Perform better</p>
        </footer>
      </div>
    </main>
  );
}

function SectionHeader({ numeral, title }: { numeral: string; title: string }) {
  return (
    <div className="flex items-baseline gap-sm mb-md">
      <span className="numeral">{numeral}</span>
      <h2 className="display text-[22px] sm:text-[26px] tracking-[-0.02em] leading-[1.1]">
        {title}
      </h2>
      <div className="flex-1 h-[1px] bg-linen ml-xs" />
    </div>
  );
}
