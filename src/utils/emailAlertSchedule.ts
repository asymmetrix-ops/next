import type { EmailAlert } from "@/types/emailAlerts";

function getZonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = dtf.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function getZonedWeekdayIndex(date: Date, timeZone: string): number {
  // 0=Sunday ... 6=Saturday
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

function parseHHmm(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function zonedLocalDateTimeToUtcIso(args: {
  timeZone: string;
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
}): string {
  const { timeZone, year, month, day, hour, minute } = args;

  // Start with a UTC guess, then shift until the formatted zoned time matches the desired local time.
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  for (let i = 0; i < 2; i++) {
    const actual = getZonedParts(guess, timeZone);
    const desiredAsUTC = Date.UTC(year, month - 1, day, hour, minute, 0);
    const actualAsUTC = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      0
    );
    const deltaMs = desiredAsUTC - actualAsUTC;
    if (deltaMs === 0) break;
    guess = new Date(guess.getTime() + deltaMs);
  }

  return guess.toISOString();
}

function addDaysToYMD(
  year: number,
  month: number,
  day: number,
  daysToAdd: number
): { year: number; month: number; day: number } {
  const ms = Date.UTC(year, month - 1, day, 12, 0, 0) + daysToAdd * 86400000;
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function dayOfWeekToIndex(dayOfWeek: string): number | null {
  const s = (dayOfWeek || "").toLowerCase().trim();
  const map: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return map[s] ?? null;
}

export function computeNextRunAtUtcIso(alert: Pick<
  EmailAlert,
  "email_frequency" | "day_of_week" | "timezone" | "send_time_local"
>): string | null {
  if (alert.email_frequency === "as_added") return null;

  const timeZone = alert.timezone || "Europe/London";
  const time = alert.send_time_local ? parseHHmm(alert.send_time_local) : null;
  if (!time) return null;

  const now = new Date();
  const nowZ = getZonedParts(now, timeZone);

  if (alert.email_frequency === "daily") {
    // Today at HH:mm in the chosen timezone; if already passed, schedule for tomorrow.
    let ymd = { year: nowZ.year, month: nowZ.month, day: nowZ.day };
    let candidateIso = zonedLocalDateTimeToUtcIso({
      timeZone,
      ...ymd,
      hour: time.hour,
      minute: time.minute,
    });
    if (new Date(candidateIso).getTime() <= now.getTime()) {
      ymd = addDaysToYMD(ymd.year, ymd.month, ymd.day, 1);
      candidateIso = zonedLocalDateTimeToUtcIso({
        timeZone,
        ...ymd,
        hour: time.hour,
        minute: time.minute,
      });
    }
    return candidateIso;
  }

  // weekly
  const targetIdx = dayOfWeekToIndex(alert.day_of_week);
  if (targetIdx == null) return null;
  const todayIdx = getZonedWeekdayIndex(now, timeZone);

  let deltaDays = (targetIdx - todayIdx + 7) % 7;
  let ymd = addDaysToYMD(nowZ.year, nowZ.month, nowZ.day, deltaDays);
  let candidateIso = zonedLocalDateTimeToUtcIso({
    timeZone,
    ...ymd,
    hour: time.hour,
    minute: time.minute,
  });

  if (deltaDays === 0 && new Date(candidateIso).getTime() <= now.getTime()) {
    deltaDays = 7;
    ymd = addDaysToYMD(nowZ.year, nowZ.month, nowZ.day, deltaDays);
    candidateIso = zonedLocalDateTimeToUtcIso({
      timeZone,
      ...ymd,
      hour: time.hour,
      minute: time.minute,
    });
  }

  return candidateIso;
}


