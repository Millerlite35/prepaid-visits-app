// Date helpers that respect a business's own time zone (e.g. "this month" in Chicago).

// How far the time zone is ahead of UTC at a given instant, in milliseconds.
function zoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

// The instant the month began in that time zone. monthsBack = 0 is this month, 1 last month.
export function monthStart(timeZone: string, now: Date, monthsBack = 0): Date {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  let year = Number(parts.find((p) => p.type === "year")?.value);
  let month = Number(parts.find((p) => p.type === "month")?.value) - monthsBack;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  const guess = Date.UTC(year, month - 1, 1);
  // apply the offset, then re-check it (daylight saving can change it near midnight)
  const first = guess - zoneOffsetMs(timeZone, new Date(guess));
  return new Date(guess - zoneOffsetMs(timeZone, new Date(first)));
}

// "October" in that time zone
export function monthName(timeZone: string, at: Date): string {
  return at.toLocaleDateString("en-US", { timeZone, month: "long" });
}
