import { redirect } from "next/navigation";
import Logo from "../components/Logo";
import { getCurrentUser, setSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/db";
import { resolveTemplateKey } from "@/lib/prescribed-plan";
import { generatePlanArc } from "@/lib/plan";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function str(sp: SearchParams, key: string): string {
  const v = sp[key];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

async function createUser(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const ageYears = Number(formData.get("ageYears"));
  const sex = String(formData.get("sex") ?? "");
  const heightCm = Number(formData.get("heightCm"));
  const weightKg = Number(formData.get("weightKg"));
  const diet = String(formData.get("diet") ?? "");
  const raceDate = new Date(String(formData.get("raceDate") ?? ""));
  const goalTimeMinutes = Number(formData.get("goalTimeMinutes"));
  const currentWeeklyKm = Number(formData.get("currentWeeklyKm"));
  const longestRecentRunKm = Number(formData.get("longestRecentRunKm"));
  const crossfitDays = String(formData.get("crossfitDays") ?? "");
  const runDays = String(formData.get("runDays") ?? "");
  const planTemplateKey = resolveTemplateKey(
    String(formData.get("planTemplateKey") ?? "nisha"),
  );

  const stravaAthleteId = String(formData.get("stravaAthleteId") ?? "").trim();
  const stravaAccessToken = String(formData.get("stravaAccessToken") ?? "").trim();
  const stravaRefreshToken = String(formData.get("stravaRefreshToken") ?? "").trim();
  const stravaTokenExpiresRaw = String(formData.get("stravaTokenExpires") ?? "");
  const stravaTokenExpires = stravaTokenExpiresRaw
    ? Number(stravaTokenExpiresRaw)
    : null;

  if (!name || !sex || !diet || !crossfitDays || !runDays) {
    throw new Error("Missing required fields.");
  }

  const user = await prisma.user.create({
    data: {
      name,
      ageYears,
      sex,
      heightCm,
      weightKg,
      diet,
      raceDate,
      goalTimeMinutes,
      currentWeeklyKm,
      longestRecentRunKm,
      crossfitDays,
      runDays,
      planTemplateKey,
      stravaAthleteId: stravaAthleteId || null,
      stravaAccessToken: stravaAccessToken || null,
      stravaRefreshToken: stravaRefreshToken || null,
      stravaTokenExpires,
    },
  });

  await setSessionCookie(user.id);
  try {
    await generatePlanArc(user.id);
  } catch (e) {
    console.error("[onboarding] generatePlanArc failed:", e);
  }
  redirect("/");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const existing = await getCurrentUser();
  if (existing) redirect("/");

  const sp = await searchParams;
  const firstName = str(sp, "firstName");
  const stravaAthleteId = str(sp, "stravaAthleteId");
  const stravaAccessToken = str(sp, "stravaAccessToken");
  const stravaRefreshToken = str(sp, "stravaRefreshToken");
  const stravaTokenExpires = str(sp, "stravaTokenExpires");

  return (
    <main className="min-h-screen text-obsidian">
      <div className="mx-auto max-w-[720px] px-sm sm:px-md md:px-xl py-xl sm:py-2xl">
        <nav className="flex items-center gap-sm mb-lg rise stagger-1">
          <Logo />
          <span className="display text-[22px] sm:text-[26px] tracking-[-0.015em]">
            Welcome{firstName ? `, ${firstName}` : ""}
          </span>
        </nav>

        <section className="card p-md sm:p-lg rise stagger-2">
          <p className="eyebrow mb-xs text-[14px]">Set up your plan</p>
          <h1 className="display text-[28px] sm:text-[36px] tracking-[-0.02em] leading-[1.1] mb-md">
            Tell us about you.
          </h1>

          <form action={createUser} className="grid gap-md">
            <input type="hidden" name="stravaAthleteId" value={stravaAthleteId} />
            <input type="hidden" name="stravaAccessToken" value={stravaAccessToken} />
            <input type="hidden" name="stravaRefreshToken" value={stravaRefreshToken} />
            <input type="hidden" name="stravaTokenExpires" value={stravaTokenExpires} />

            <Field label="Name">
              <input name="name" required defaultValue={firstName} className="field" />
            </Field>

            <Field label="Plan template">
              <select name="planTemplateKey" className="field" defaultValue="nisha">
                <option value="nisha">Nisha — goal 2:40</option>
                <option value="vibhor">Vibhor — goal 2:30</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-md">
              <Field label="Age (years)">
                <input name="ageYears" type="number" required className="field" />
              </Field>
              <Field label="Sex">
                <select name="sex" className="field" defaultValue="male">
                  <option value="male">male</option>
                  <option value="female">female</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-md">
              <Field label="Height (cm)">
                <input name="heightCm" type="number" step="0.1" required className="field" />
              </Field>
              <Field label="Weight (kg)">
                <input name="weightKg" type="number" step="0.1" required className="field" />
              </Field>
            </div>

            <Field label="Diet">
              <select name="diet" className="field" defaultValue="omnivore">
                <option value="omnivore">omnivore</option>
                <option value="vegetarian">vegetarian</option>
                <option value="vegan">vegan</option>
              </select>
            </Field>

            <Field label="Race date">
              <input
                name="raceDate"
                type="date"
                required
                defaultValue="2026-07-25"
                className="field"
              />
            </Field>

            <Field label="Goal time (minutes)">
              <input
                name="goalTimeMinutes"
                type="number"
                required
                defaultValue={150}
                className="field"
              />
            </Field>

            <div className="grid grid-cols-2 gap-md">
              <Field label="Current weekly km">
                <input
                  name="currentWeeklyKm"
                  type="number"
                  step="0.1"
                  required
                  defaultValue={15}
                  className="field"
                />
              </Field>
              <Field label="Longest recent run (km)">
                <input
                  name="longestRecentRunKm"
                  type="number"
                  step="0.1"
                  required
                  defaultValue={10}
                  className="field"
                />
              </Field>
            </div>

            <Field label="CrossFit days (comma-separated)">
              <input
                name="crossfitDays"
                required
                defaultValue="Mon,Wed,Fri"
                className="field"
              />
            </Field>
            <Field label="Run days (comma-separated)">
              <input name="runDays" required defaultValue="Thu,Sun" className="field" />
            </Field>

            <button type="submit" className="btn-primary w-fit">
              Create my plan
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-xs">
      <span className="eyebrow text-[12px]">{label}</span>
      {children}
    </label>
  );
}
