export const DAILY_TARGETS = {
  calories: 2278,
  protein: 160,
  carbs: 280,
  fat: 63,
} as const;

export type DailyTargets = typeof DAILY_TARGETS;
