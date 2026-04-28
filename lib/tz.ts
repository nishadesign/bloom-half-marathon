const TZ = "America/Los_Angeles";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function zoneParts(d: Date) {
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
    h: Number(parts.hour === "24" ? "0" : parts.hour),
    mm: Number(parts.minute),
    s: Number(parts.second),
  };
}

function zoneOffsetMs(d: Date) {
  const p = zoneParts(d);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mm, p.s);
  return asUtc - d.getTime();
}

export function istDayStartUTC(d: Date = new Date()): Date {
  const p = zoneParts(d);
  const noonLocal = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0));
  const offset = zoneOffsetMs(noonLocal);
  return new Date(Date.UTC(p.y, p.m - 1, p.d) - offset);
}

export function istDayEndUTC(d: Date = new Date()): Date {
  const start = istDayStartUTC(d);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function istMondayStartUTC(d: Date = new Date()): Date {
  const dayStart = istDayStartUTC(d);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(dayStart);
  const idx = DAYS.findIndex((x) => weekday.startsWith(x));
  const offsetFromMonday = (idx + 6) % 7;
  return new Date(dayStart.getTime() - offsetFromMonday * 24 * 60 * 60 * 1000);
}

export function istDayKey(d: Date = new Date()): string {
  const p = zoneParts(d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function istDayShort(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  });
  const label = fmt.format(d);
  return DAYS.find((x) => label.startsWith(x)) ?? label;
}
