import { TierLevel } from "../types";

export const BASE_POINTS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 3,
  3: 10,
  4: 50,
  5: 1000,
};

/**
 * Calculates net points based on tier level and binary defense occurrence.
 * - Level 1: Defense deduction = 1 pt (Net: 0 pts)
 * - Levels 2-5: Defense deduction = 2 pts (Net: max(0, base - 2))
 */
export function calculateIncidentPoints(tierLevel: number, defenseOccurred: boolean): number {
  const base = BASE_POINTS[tierLevel] ?? 0;
  if (!defenseOccurred) {
    return base;
  }
  if (tierLevel === 1) {
    return Math.max(0, base - 1);
  }
  return Math.max(0, base - 2);
}

/**
 * Derives surge status: If no defense occurred, an impulsive surge is recorded by default.
 */
export function deriveSurgeOccurred(defenseOccurred: boolean): boolean {
  return !defenseOccurred;
}

/**
 * Calculates full-history streak for each tier (1 to 5, and L0/Pure Focus).
 * Streaks track continuous days since the most recent incident with tier_level >= TargetTier.
 * If no incident has ever occurred at or above that tier, streak equals days since inception.
 */
export function calculateStreaks(
  incidents: Array<{ logical_date: string; tier_level: number }>,
  todayDateStr: string,
  inceptionDateStr?: string
): Record<TierLevel, number> {
  const today = new Date(todayDateStr + "T00:00:00Z");

  // Determine fallback inception date
  let fallbackDate = inceptionDateStr
    ? new Date(inceptionDateStr.substring(0, 10) + "T00:00:00Z")
    : null;

  if (!fallbackDate || isNaN(fallbackDate.getTime())) {
    if (incidents.length > 0) {
      const dates = incidents
        .map((i) => new Date(i.logical_date + "T00:00:00Z").getTime())
        .filter((t) => !isNaN(t));
      if (dates.length > 0) {
        fallbackDate = new Date(Math.min(...dates));
      }
    }
  }

  // If still no date, default inception to today (streak = 0 or 1)
  const baseInception = fallbackDate && !isNaN(fallbackDate.getTime()) ? fallbackDate : today;

  const msPerDay = 1000 * 60 * 60 * 24;
  const maxInceptionDays = Math.max(0, Math.floor((today.getTime() - baseInception.getTime()) / msPerDay));

  const result: Record<TierLevel, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  // For each tier 1 to 5:
  for (let targetTier = 1; targetTier <= 5; targetTier++) {
    // Find all incidents with tier_level >= targetTier
    const matching = incidents.filter((i) => i.tier_level >= targetTier);

    if (matching.length === 0) {
      // Never had an incident at or above this tier
      result[targetTier as TierLevel] = maxInceptionDays;
    } else {
      // Find latest logical_date among matching incidents
      let latestTime = -Infinity;
      for (const inc of matching) {
        const d = new Date(inc.logical_date + "T00:00:00Z").getTime();
        if (d > latestTime) latestTime = d;
      }
      const daysSince = Math.max(0, Math.floor((today.getTime() - latestTime) / msPerDay));
      result[targetTier as TierLevel] = daysSince;
    }
  }

  // Tier 0 (Pure Focus streak):
  // L0 is uninterrupted focus (zero drift of ANY tier >= 1).
  // Thus L0 streak is identical to Tier 1 streak (days since any incident occurred).
  result[0] = result[1];

  return result;
}
