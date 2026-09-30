/**
 * Formats a Date object to YYYY-MM-DD string in local time.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's calendar date in YYYY-MM-DD format.
 */
export function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

/**
 * Returns yesterday's calendar date in YYYY-MM-DD format.
 */
export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

/**
 * Awake-Cycle Logical Date Derivation:
 * If a timestamp falls in the late-night window (12:00 AM - 5:59:59 AM, local hours 0-5),
 * it is attributed to the biological waking cycle of the preceding calendar day (Yesterday).
 */
export function getLogicalDateForTimestamp(target: Date = new Date()): string {
  const hours = target.getHours();
  if (hours >= 0 && hours < 6) {
    const prev = new Date(target);
    prev.setDate(prev.getDate() - 1);
    return formatLocalDate(prev);
  }
  return formatLocalDate(target);
}

/**
 * Classifies whether a timestamp is "late night": 10:00 PM (22:00) and later,
 * including overnight hours before 6:00 AM (hours >= 22 or hours < 6).
 */
export function isLateNight(time: string | Date = new Date()): boolean {
  const d = new Date(time);
  const hours = d.getHours();
  return hours >= 22 || hours < 6;
}

/**
 * Checks if current local time is in the late-night window (12 AM - 5:59 AM).
 */
export function isLateNightWindow(date: Date = new Date()): boolean {
  const hours = date.getHours();
  return hours >= 0 && hours < 6;
}

/**
 * Formats duration between start and end times into human-readable string.
 */
export function formatDuration(startTime: string | Date, endTime: string | Date): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diffMinutes = Math.max(0, Math.round((end - start) / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

/**
 * Formats a timestamp into a clean 12-hour or 24-hour time string (e.g. 03:15 AM).
 */
export function formatTimeOnly(time: string | Date): string {
  const d = new Date(time);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Formats a date into a clean display string (e.g. "Mon, Nov 14").
 */
export function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
