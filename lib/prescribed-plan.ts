export type SessionCategory = "Easy" | "Tempo" | "Intervals" | "Long" | "Race";

export type PrescribedSession = {
  category: SessionCategory;
  details: string;
  goal: string;
  durationMinutes: number;
  targetDistanceKm?: number;
  targetPace?: string;
};

export type PrescribedWeek = {
  weekNumber: number;
  sessions: PrescribedSession[];
};

export type PlanTemplateKey = "nisha" | "vibhor";

export const RACE_WEEK_NUMBER = 18;

const NISHA_PLAN: PrescribedWeek[] = [
  {
    weekNumber: 5,
    sessions: [
      { category: "Tempo", details: "10min @ 7:50/km + 4×6min @ 7:20/km (2min recovery @ 8:20/km)", goal: "Threshold", durationMinutes: 44, targetPace: "7:20/km" },
      { category: "Long", details: "85min @ 7:45/km", goal: "Endurance", durationMinutes: 85, targetDistanceKm: 11.0, targetPace: "7:45/km" },
    ],
  },
  {
    weekNumber: 6,
    sessions: [
      { category: "Intervals", details: "10min @ 7:50/km + 5×3min @ 6:45/km (2min recovery @ 8:20/km)", goal: "Speed", durationMinutes: 33, targetPace: "6:45/km" },
      { category: "Long", details: "90min @ 7:45/km", goal: "Endurance", durationMinutes: 90, targetDistanceKm: 11.6, targetPace: "7:45/km" },
    ],
  },
  {
    weekNumber: 7,
    sessions: [
      { category: "Tempo", details: "10min @ 7:45/km + 3×10min @ 7:20/km (2min recovery @ 8:15/km)", goal: "Tempo endurance", durationMinutes: 44, targetPace: "7:20/km" },
      { category: "Long", details: "95min @ 7:40/km", goal: "Endurance", durationMinutes: 95, targetDistanceKm: 12.4, targetPace: "7:40/km" },
    ],
  },
  {
    weekNumber: 8,
    sessions: [
      { category: "Intervals", details: "10min @ 7:45/km + 6×3min @ 6:40/km (2min recovery @ 8:15/km)", goal: "VO2", durationMinutes: 38, targetPace: "6:40/km" },
      { category: "Long", details: "100min @ 7:40/km", goal: "Endurance", durationMinutes: 100, targetDistanceKm: 13.0, targetPace: "7:40/km" },
    ],
  },
  {
    weekNumber: 9,
    sessions: [
      { category: "Tempo", details: "10min @ 7:45/km + 4×8min @ 7:20/km (2min recovery @ 8:15/km)", goal: "Threshold", durationMinutes: 48, targetPace: "7:20/km" },
      { category: "Long", details: "105min @ 7:35/km", goal: "Endurance", durationMinutes: 105, targetDistanceKm: 13.8, targetPace: "7:35/km" },
    ],
  },
  {
    weekNumber: 10,
    sessions: [
      { category: "Intervals", details: "10min @ 7:50/km + 5×2min @ 6:40/km (2min recovery @ 8:20/km)", goal: "Sharpen", durationMinutes: 28, targetPace: "6:40/km" },
      { category: "Long", details: "85min @ 7:50/km", goal: "Recovery week", durationMinutes: 85, targetDistanceKm: 10.8, targetPace: "7:50/km" },
    ],
  },
  {
    weekNumber: 11,
    sessions: [
      { category: "Easy", details: "35min @ 8:00/km", goal: "Recovery", durationMinutes: 35, targetDistanceKm: 4.4, targetPace: "8:00/km" },
      { category: "Tempo", details: "10min @ 7:45/km + 4×8min @ 7:20/km (2min recovery @ 8:15/km)", goal: "Tempo", durationMinutes: 48, targetPace: "7:20/km" },
      { category: "Long", details: "110min @ 7:35/km", goal: "Endurance", durationMinutes: 110, targetDistanceKm: 14.5, targetPace: "7:35/km" },
    ],
  },
  {
    weekNumber: 12,
    sessions: [
      { category: "Easy", details: "40min @ 7:55/km", goal: "Aerobic", durationMinutes: 40, targetDistanceKm: 5.1, targetPace: "7:55/km" },
      { category: "Intervals", details: "10min @ 7:45/km + 6×3min @ 6:40/km (2min recovery @ 8:15/km)", goal: "Speed", durationMinutes: 38, targetPace: "6:40/km" },
      { category: "Long", details: "115min @ 7:35/km", goal: "Endurance", durationMinutes: 115, targetDistanceKm: 15.2, targetPace: "7:35/km" },
    ],
  },
  {
    weekNumber: 13,
    sessions: [
      { category: "Easy", details: "35min @ 7:55/km", goal: "Recovery", durationMinutes: 35, targetDistanceKm: 4.4, targetPace: "7:55/km" },
      { category: "Tempo", details: "10min @ 7:45/km + 3×12min @ 7:20/km (2min recovery @ 8:15/km)", goal: "Tempo endurance", durationMinutes: 50, targetPace: "7:20/km" },
      { category: "Long", details: "120min @ 7:30/km", goal: "Peak endurance", durationMinutes: 120, targetDistanceKm: 16.0, targetPace: "7:30/km" },
    ],
  },
  {
    weekNumber: 14,
    sessions: [
      { category: "Easy", details: "30min @ 8:00/km", goal: "Recovery", durationMinutes: 30, targetDistanceKm: 3.8, targetPace: "8:00/km" },
      { category: "Intervals", details: "10min @ 7:45/km + 5×3min @ 6:35/km (2min recovery @ 8:15/km)", goal: "Sharpness", durationMinutes: 33, targetPace: "6:35/km" },
      { category: "Long", details: "125min @ 7:30/km", goal: "Peak endurance", durationMinutes: 125, targetDistanceKm: 16.7, targetPace: "7:30/km" },
    ],
  },
  {
    weekNumber: 15,
    sessions: [
      { category: "Easy", details: "40min @ 7:55/km", goal: "Aerobic", durationMinutes: 40, targetDistanceKm: 5.1, targetPace: "7:55/km" },
      { category: "Tempo", details: "10min @ 7:45/km + 4×6min @ 7:20/km (2min recovery @ 8:15/km)", goal: "Threshold", durationMinutes: 42, targetPace: "7:20/km" },
      { category: "Long", details: "110min @ 7:35/km", goal: "Controlled long", durationMinutes: 110, targetDistanceKm: 14.5, targetPace: "7:35/km" },
    ],
  },
  {
    weekNumber: 16,
    sessions: [
      { category: "Easy", details: "35min @ 8:00/km", goal: "Recovery", durationMinutes: 35, targetDistanceKm: 4.4, targetPace: "8:00/km" },
      { category: "Tempo", details: "10min @ 7:45/km + 3×8min @ 7:20/km (2min recovery @ 8:15/km)", goal: "Sharpen", durationMinutes: 40, targetPace: "7:20/km" },
      { category: "Long", details: "90min @ 7:40/km", goal: "Taper start", durationMinutes: 90, targetDistanceKm: 11.7, targetPace: "7:40/km" },
    ],
  },
  {
    weekNumber: 17,
    sessions: [
      { category: "Easy", details: "30min @ 8:00/km", goal: "Recovery", durationMinutes: 30, targetDistanceKm: 3.8, targetPace: "8:00/km" },
      { category: "Tempo", details: "10min @ 7:45/km + 3×5min @ 7:15/km (2min recovery @ 8:15/km)", goal: "Sharpness", durationMinutes: 31, targetPace: "7:15/km" },
      { category: "Long", details: "70min @ 7:45/km", goal: "Taper", durationMinutes: 70, targetDistanceKm: 9.0, targetPace: "7:45/km" },
    ],
  },
  {
    weekNumber: 18,
    sessions: [
      { category: "Easy", details: "25min @ 8:10/km", goal: "Freshen up", durationMinutes: 25, targetDistanceKm: 3.1, targetPace: "8:10/km" },
      { category: "Tempo", details: "20min incl 2×3min @ 7:15/km (2min recovery @ 8:15/km)", goal: "Activation", durationMinutes: 20, targetPace: "7:15/km" },
      { category: "Race", details: "21.1km @ ~7:35/km", goal: "Execute 2:40", durationMinutes: 160, targetDistanceKm: 21.1, targetPace: "7:35/km" },
    ],
  },
];

const VIBHOR_PLAN: PrescribedWeek[] = [
  {
    weekNumber: 5,
    sessions: [
      { category: "Tempo", details: "10min @ 7:40/km + 4×6min @ 7:00/km (2min recovery @ 8:15/km)", goal: "Threshold", durationMinutes: 44, targetPace: "7:00/km" },
      { category: "Long", details: "85min @ 7:35/km", goal: "Endurance", durationMinutes: 85, targetDistanceKm: 11.2, targetPace: "7:35/km" },
    ],
  },
  {
    weekNumber: 6,
    sessions: [
      { category: "Intervals", details: "10min @ 7:40/km + 5×3min @ 6:25/km (2min recovery @ 8:15/km)", goal: "Speed", durationMinutes: 33, targetPace: "6:25/km" },
      { category: "Long", details: "90min @ 7:35/km", goal: "Endurance", durationMinutes: 90, targetDistanceKm: 11.9, targetPace: "7:35/km" },
    ],
  },
  {
    weekNumber: 7,
    sessions: [
      { category: "Tempo", details: "10min @ 7:35/km + 3×10min @ 7:00/km (2min recovery @ 8:10/km)", goal: "Tempo endurance", durationMinutes: 44, targetPace: "7:00/km" },
      { category: "Long", details: "95min @ 7:30/km", goal: "Endurance", durationMinutes: 95, targetDistanceKm: 12.7, targetPace: "7:30/km" },
    ],
  },
  {
    weekNumber: 8,
    sessions: [
      { category: "Intervals", details: "10min @ 7:35/km + 6×3min @ 6:20/km (2min recovery @ 8:10/km)", goal: "VO2", durationMinutes: 38, targetPace: "6:20/km" },
      { category: "Long", details: "100min @ 7:30/km", goal: "Endurance", durationMinutes: 100, targetDistanceKm: 13.3, targetPace: "7:30/km" },
    ],
  },
  {
    weekNumber: 9,
    sessions: [
      { category: "Tempo", details: "10min @ 7:35/km + 4×8min @ 6:55/km (2min recovery @ 8:10/km)", goal: "Threshold", durationMinutes: 48, targetPace: "6:55/km" },
      { category: "Long", details: "105min @ 7:25/km", goal: "Endurance", durationMinutes: 105, targetDistanceKm: 14.2, targetPace: "7:25/km" },
    ],
  },
  {
    weekNumber: 10,
    sessions: [
      { category: "Intervals", details: "10min @ 7:40/km + 5×2min @ 6:20/km (2min recovery @ 8:15/km)", goal: "Sharpen", durationMinutes: 28, targetPace: "6:20/km" },
      { category: "Long", details: "85min @ 7:40/km", goal: "Recovery week", durationMinutes: 85, targetDistanceKm: 11.1, targetPace: "7:40/km" },
    ],
  },
  {
    weekNumber: 11,
    sessions: [
      { category: "Easy", details: "35min @ 7:50/km", goal: "Recovery", durationMinutes: 35, targetDistanceKm: 4.5, targetPace: "7:50/km" },
      { category: "Tempo", details: "10min @ 7:35/km + 4×8min @ 6:55/km (2min recovery @ 8:10/km)", goal: "Tempo", durationMinutes: 48, targetPace: "6:55/km" },
      { category: "Long", details: "110min @ 7:25/km", goal: "Endurance", durationMinutes: 110, targetDistanceKm: 14.8, targetPace: "7:25/km" },
    ],
  },
  {
    weekNumber: 12,
    sessions: [
      { category: "Easy", details: "40min @ 7:45/km", goal: "Aerobic", durationMinutes: 40, targetDistanceKm: 5.2, targetPace: "7:45/km" },
      { category: "Intervals", details: "10min @ 7:35/km + 6×3min @ 6:20/km (2min recovery @ 8:10/km)", goal: "Speed", durationMinutes: 38, targetPace: "6:20/km" },
      { category: "Long", details: "115min @ 7:25/km", goal: "Endurance", durationMinutes: 115, targetDistanceKm: 15.5, targetPace: "7:25/km" },
    ],
  },
  {
    weekNumber: 13,
    sessions: [
      { category: "Easy", details: "35min @ 7:45/km", goal: "Recovery", durationMinutes: 35, targetDistanceKm: 4.5, targetPace: "7:45/km" },
      { category: "Tempo", details: "10min @ 7:35/km + 3×12min @ 7:00/km (2min recovery @ 8:10/km)", goal: "Tempo endurance", durationMinutes: 50, targetPace: "7:00/km" },
      { category: "Long", details: "120min @ 7:20/km", goal: "Peak endurance", durationMinutes: 120, targetDistanceKm: 16.4, targetPace: "7:20/km" },
    ],
  },
  {
    weekNumber: 14,
    sessions: [
      { category: "Easy", details: "30min @ 7:50/km", goal: "Recovery", durationMinutes: 30, targetDistanceKm: 3.8, targetPace: "7:50/km" },
      { category: "Intervals", details: "10min @ 7:35/km + 5×3min @ 6:15/km (2min recovery @ 8:10/km)", goal: "Sharpness", durationMinutes: 33, targetPace: "6:15/km" },
      { category: "Long", details: "125min @ 7:20/km", goal: "Peak endurance", durationMinutes: 125, targetDistanceKm: 17.0, targetPace: "7:20/km" },
    ],
  },
  {
    weekNumber: 15,
    sessions: [
      { category: "Easy", details: "40min @ 7:45/km", goal: "Aerobic", durationMinutes: 40, targetDistanceKm: 5.2, targetPace: "7:45/km" },
      { category: "Tempo", details: "10min @ 7:35/km + 4×6min @ 6:55/km (2min recovery @ 8:10/km)", goal: "Threshold", durationMinutes: 42, targetPace: "6:55/km" },
      { category: "Long", details: "110min @ 7:25/km", goal: "Controlled long", durationMinutes: 110, targetDistanceKm: 14.8, targetPace: "7:25/km" },
    ],
  },
  {
    weekNumber: 16,
    sessions: [
      { category: "Easy", details: "35min @ 7:50/km", goal: "Recovery", durationMinutes: 35, targetDistanceKm: 4.5, targetPace: "7:50/km" },
      { category: "Tempo", details: "10min @ 7:35/km + 3×8min @ 6:55/km (2min recovery @ 8:10/km)", goal: "Sharpen", durationMinutes: 40, targetPace: "6:55/km" },
      { category: "Long", details: "90min @ 7:30/km", goal: "Taper start", durationMinutes: 90, targetDistanceKm: 12.0, targetPace: "7:30/km" },
    ],
  },
  {
    weekNumber: 17,
    sessions: [
      { category: "Easy", details: "30min @ 7:50/km", goal: "Recovery", durationMinutes: 30, targetDistanceKm: 3.8, targetPace: "7:50/km" },
      { category: "Tempo", details: "10min @ 7:35/km + 3×5min @ 6:50/km (2min recovery @ 8:10/km)", goal: "Sharpness", durationMinutes: 31, targetPace: "6:50/km" },
      { category: "Long", details: "70min @ 7:35/km", goal: "Taper", durationMinutes: 70, targetDistanceKm: 9.2, targetPace: "7:35/km" },
    ],
  },
  {
    weekNumber: 18,
    sessions: [
      { category: "Easy", details: "25min @ 8:00/km", goal: "Freshen up", durationMinutes: 25, targetDistanceKm: 3.1, targetPace: "8:00/km" },
      { category: "Tempo", details: "20min incl 2×3min @ 6:50/km (2min recovery @ 8:10/km)", goal: "Activation", durationMinutes: 20, targetPace: "6:50/km" },
      { category: "Race", details: "21.1km @ ~7:05/km", goal: "Execute 2:30", durationMinutes: 150, targetDistanceKm: 21.1, targetPace: "7:05/km" },
    ],
  },
];

export const PLAN_TEMPLATES: Record<PlanTemplateKey, PrescribedWeek[]> = {
  nisha: NISHA_PLAN,
  vibhor: VIBHOR_PLAN,
};

export function resolveTemplateKey(key: string | null | undefined): PlanTemplateKey {
  return key === "vibhor" ? "vibhor" : "nisha";
}

export function getPlanTemplate(key: string | null | undefined): PrescribedWeek[] {
  return PLAN_TEMPLATES[resolveTemplateKey(key)];
}

export function getPrescribedWeek(
  weekNumber: number,
  templateKey: string | null | undefined = "nisha",
): PrescribedWeek | null {
  return getPlanTemplate(templateKey).find((w) => w.weekNumber === weekNumber) ?? null;
}

export function pickSession(
  week: PrescribedWeek,
  category: SessionCategory,
): PrescribedSession | null {
  return week.sessions.find((s) => s.category === category) ?? null;
}
