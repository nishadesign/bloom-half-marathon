import type { DayScore } from "@/lib/adherence";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Props = {
  grid: DayScore[][];
  raceDate: Date;
};

export default function AdherenceHeatmap({ grid, raceDate }: Props) {
  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((raceDate.getTime() - now.getTime()) / MS_PER_DAY),
  );

  return (
    <article className="card p-md sm:p-lg">
      <div className="mb-md">
        <div className="flex items-baseline gap-xs">
          <span className="stat-big text-[56px] sm:text-[72px]">{daysLeft}</span>
          <span className="display-italic text-[18px] text-smoke">
            {daysLeft === 1 ? "day to race" : "days to race"}
          </span>
        </div>
      </div>

      <div className="rule mb-md" />

      <div className="flex gap-xs">
        <div className="flex flex-col justify-between py-[2px] shrink-0">
          {WEEKDAY_LABELS.map((l, i) => (
            <span
              key={i}
              className="display-italic text-[10px] text-smoke w-[10px] leading-none"
              aria-hidden
            >
              {i % 2 === 0 ? l : ""}
            </span>
          ))}
        </div>

        <div
          className="flex-1 grid gap-[3px] max-w-full"
          style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
        >
          {grid.map((week, wi) => (
            <div key={wi} className="grid grid-rows-7 gap-[3px] justify-items-center">
              {week.map((day, di) => (
                <Tile key={day.date} day={day} delay={(wi * 7 + di) * 2} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-md flex items-center justify-between text-[11px]">
        <p className="display-italic text-smoke">12 wks past · race day ahead</p>
        <div className="flex items-center gap-xs">
          <span className="display-italic text-smoke">Less</span>
          <Swatch level={0} />
          <Swatch level={1} />
          <Swatch level={2} />
          <span className="display-italic text-smoke">More</span>
        </div>
      </div>
    </article>
  );
}

function Tile({ day, delay }: { day: DayScore; delay: number }) {
  const level = day.inFuture ? -1 : (day.workoutHit ? 1 : 0) + (day.nutritionHit ? 1 : 0);
  const title = buildTitle(day);
  const cls = tileClass(level, day.inFuture);

  return (
    <div
      className={`aspect-square w-full max-h-[14px] rounded-[3px] tile-in ${cls}`}
      style={{ animationDelay: `${Math.min(delay, 700)}ms` }}
      title={title}
      aria-label={title}
    />
  );
}

function Swatch({ level }: { level: 0 | 1 | 2 }) {
  return <div className={`h-[12px] w-[12px] rounded-[3px] ${tileClass(level, false)}`} />;
}

function tileClass(level: number, inFuture: boolean) {
  if (inFuture) return "border border-linen bg-transparent";
  if (level <= 0) return "border border-linen bg-transparent";
  if (level === 1) return "bg-sand/60";
  return "bg-sand-deep";
}

function buildTitle(day: DayScore) {
  if (day.inFuture) return `${day.date} · upcoming`;
  const parts: string[] = [day.date];
  if (day.planFocus) parts.push(day.planFocus.replace(/_/g, " "));
  if (day.workoutHit !== null) {
    parts.push(`workout: ${day.workoutHit ? "hit" : "miss"}`);
  }
  if (day.nutritionHit !== null) {
    parts.push(
      `nutrition: ${day.nutritionHit ? "hit" : "miss"} (${Math.round(day.calories)} kcal · ${Math.round(day.protein)} g P)`
    );
  }
  return parts.join(" · ");
}
