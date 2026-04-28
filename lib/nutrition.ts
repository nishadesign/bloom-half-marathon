export function mifflinStJeor(
  sex: string,
  weightKg: number,
  heightCm: number,
  ageYears: number
) {
  const s = sex.toLowerCase() === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + s;
}

export function activityFactor(crossfitDaysCount: number, runDaysCount: number) {
  const totalSessions = crossfitDaysCount + runDaysCount;
  if (totalSessions >= 6) return 1.725;
  if (totalSessions >= 4) return 1.55;
  if (totalSessions >= 2) return 1.375;
  return 1.2;
}

export function proteinTargetGrams(weightKg: number) {
  return Math.round(weightKg * 1.6);
}

export function carbTargetGramsRunDay(weightKg: number) {
  return Math.round(weightKg * 6);
}

export function carbTargetGramsEasyDay(weightKg: number) {
  return Math.round(weightKg * 4);
}

export function fatTargetGrams(calories: number) {
  return Math.round((calories * 0.25) / 9);
}
