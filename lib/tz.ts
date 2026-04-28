const TZ = "Asia/Kolkata";

function istParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  );
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
  };
}

export function istDayStartUTC(d: Date = new Date()): Date {
  const { y, m, d: day } = istParts(d);
  return new Date(Date.UTC(y, m - 1, day) - 5.5 * 60 * 60 * 1000);
}

export function istDayEndUTC(d: Date = new Date()): Date {
  const start = istDayStartUTC(d);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function istMondayStartUTC(d: Date = new Date()): Date {
  const { y, m, d: day } = istParts(d);
  const utcDate = new Date(Date.UTC(y, m - 1, day));
  const weekday = utcDate.getUTCDay();
  const offset = (weekday + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - offset);
  return new Date(utcDate.getTime() - 5.5 * 60 * 60 * 1000);
}

export function istDayKey(d: Date = new Date()): string {
  const { y, m, d: day } = istParts(d);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function istDayShort(d: Date = new Date()): string {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  });
  const label = fmt.format(d);
  return DAYS.find((d) => label.startsWith(d)) ?? label;
}
