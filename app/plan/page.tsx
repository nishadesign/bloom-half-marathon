import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getCurrentWeekPlan, type WeekPlan } from "@/lib/plan";
import { istMondayStartUTC } from "@/lib/tz";
import Logo from "../components/Logo";
import RebuildButton from "./RebuildButton";
import DoneButton from "./DoneButton";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = await getCurrentWeekPlan(user.id);
  const stravaConnected = !!user.stravaAccessToken;

  const weekStart = istMondayStartUTC();
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const weekActivities = await prisma.activity.findMany({
    where: { userId: user.id, startDate: { gte: weekStart, lt: weekEnd } },
    select: { startDate: true },
  });
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
  const doneDays = new Set(
    weekActivities.map((a) => {
      const dayIdx = Math.floor(
        (a.startDate.getTime() - weekStart.getTime()) / 86400000,
      );
      return DAY_NAMES[Math.max(0, Math.min(6, dayIdx))];
    }),
  );

  return (
    <main className="min-h-screen text-obsidian">
      <div className="mx-auto max-w-[1120px] px-sm sm:px-md md:px-xl py-xl sm:py-2xl">
        <nav className="flex items-center justify-between mb-lg rise stagger-1">
          <Link href="/" className="flex items-center gap-sm">
            <Logo />
            <span className="display text-[22px] sm:text-[26px] tracking-[-0.015em]">
              Hey {user.name}
            </span>
          </Link>
          <Link href="/" className="btn-ghost">← Back</Link>
        </nav>

        <div className="mb-lg flex flex-col sm:flex-row gap-sm sm:gap-md sm:items-center">
          <RebuildButton />
        </div>

        {!plan ? (
          <section className="card p-md sm:p-lg">
            <p className="display-italic text-[16px] text-smoke">
              No plan for this week yet. Hit Rebuild plan above.
            </p>
          </section>
        ) : (
          <WeekView
            plan={plan}
            showDone={!stravaConnected}
            doneDays={doneDays}
          />
        )}
      </div>
    </main>
  );
}

function WeekView({
  plan,
  showDone,
  doneDays,
}: {
  plan: WeekPlan;
  showDone: boolean;
  doneDays: Set<string>;
}) {
  return (
    <>
      <header className="mb-lg rise stagger-2">
        <p className="eyebrow mb-xs text-[14px]">Week {plan.weekNumber} · {plan.phase}</p>
        <h1 className="display text-[32px] sm:text-[44px] tracking-[-0.02em] leading-[1.1]">
          {plan.summary}
        </h1>
        <div className="mt-md flex items-baseline gap-lg flex-wrap">
          <div>
            <p className="eyebrow mb-[2px] text-[12px]">Weekly target</p>
            <span className="stat-med text-[28px]">{plan.weeklyMileageKm}<span className="text-smoke text-[14px] ml-[2px]">km</span></span>
          </div>
          <div>
            <p className="eyebrow mb-[2px] text-[12px]">Weeks to race</p>
            <span className="stat-med text-[28px]">{plan.weeksToRace}</span>
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="eyebrow mb-[2px] text-[12px]">Focus</p>
            <p className="display-italic text-[17px] text-ink">{plan.keyFocus}</p>
          </div>
        </div>
      </header>

      <div className="rule mb-lg" />

      <div className="grid gap-sm rise stagger-3">
        {plan.days.map((d, i) => (
          <article key={d.day} className="card card-hover p-md sm:p-lg">
            <div className="grid grid-cols-12 gap-md items-start">
              <div className="col-span-12 sm:col-span-3">
                <p className="numeral mb-xs">{toRoman(i + 1)}</p>
                <p className="display text-[24px] sm:text-[28px] tracking-[-0.01em]">
                  {d.day}
                </p>
                <p className="display-italic text-[14px] text-smoke">
                  {d.date}
                </p>
              </div>

              <div className="col-span-12 sm:col-span-9">
                <div className="flex items-baseline gap-sm flex-wrap mb-xs">
                  <span className="display-italic text-[14px] text-sand-deep capitalize">
                    {d.focus.replace(/_/g, " ")}
                  </span>
                  <span className="text-[13px] text-smoke">
                    {[
                      d.targetDistanceKm ? `${d.targetDistanceKm} km` : null,
                      d.durationMinutes ? `${d.durationMinutes} min` : null,
                      d.targetPace ? `@ ${d.targetPace}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>

                <p className="display text-[19px] sm:text-[22px] leading-[1.3] tracking-[-0.01em] text-ink">
                  {d.session}
                </p>

                {d.targetPace && (
                  <p className="mt-xs stat-med text-[15px] text-sand-deep">
                    Target pace · {d.targetPace}
                  </p>
                )}

                {d.coachNotes && (
                  <p className="mt-sm display-italic text-[14px] text-graphite">
                    {d.coachNotes}
                  </p>
                )}

                <div className="rule mt-md mb-sm" />

                <div className="flex items-baseline justify-between gap-md flex-wrap">
                  <div className="flex items-baseline gap-md">
                    <Macro label="kcal" value={d.nutrition.calories} />
                    <Macro label="P" value={`${d.nutrition.proteinGrams}g`} />
                    <Macro label="C" value={`${d.nutrition.carbsGrams}g`} />
                    <Macro label="F" value={`${d.nutrition.fatGrams}g`} />
                  </div>
                </div>
                {d.nutrition.notes && (
                  <p className="mt-xs display-italic text-[13px] text-smoke">
                    {d.nutrition.notes}
                  </p>
                )}

                {showDone && d.focus !== "rest" && (
                  <div className="mt-md">
                    <DoneButton day={d.day} alreadyDone={doneDays.has(d.day)} />
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Macro({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-[4px]">
      <span className="text-[11px] text-smoke uppercase tracking-[0.1em]">{label}</span>
      <span className="stat-med text-[17px]">{value}</span>
    </div>
  );
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
function toRoman(n: number) {
  return ROMAN[n] ?? String(n);
}
