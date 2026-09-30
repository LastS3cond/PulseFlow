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
 * Calculates net points based on tier level and binary defense.
 * - L1: 1 pt - 1 pt defense = 0 pts
 * - L2-L5: base - 2 pts defense
 */
export function calculateIncidentPoints(tierLevel: number, defenseOccurred: boolean): number {
  const base = BASE_POINTS[tierLevel] ?? 0;
  if (!defenseOccurred) return base;
  return tierLevel === 1 ? Math.max(0, base - 1) : Math.max(0, base - 2);
}

export function deriveSurgeOccurred(defenseOccurred: boolean): boolean {
  return !defenseOccurred;
}

const MS_PER_DAY = 86400000;

/**
 * High-efficiency, single-pass streak calculation.
 * Compares ISO YYYY-MM-DD strings directly without repeated Date allocations.
 */
export function calculateStreaks(
  incidents: Array<{ logical_date: string; tier_level: number }>,
  todayDateStr: string,
  inceptionDateStr?: string
): Record<TierLevel, number> {
  const todayTime = new Date(todayDateStr + "T00:00:00Z").getTime();

  // Track latest incident date per tier in a single pass
  const latestByTier: Record<number, string> = { 1: "", 2: "", 3: "", 4: "", 5: "" };
  let earliestDate = inceptionDateStr ? inceptionDateStr.slice(0, 10) : todayDateStr;

  for (let i = 0; i < incidents.length; i++) {
    const inc = incidents[i];
    const d = inc.logical_date;
    if (d < earliestDate) earliestDate = d;

    // For any tier <= inc.tier_level, this incident resets that tier's streak
    for (let t = 1; t <= inc.tier_level; t++) {
      if (!latestByTier[t] || d > latestByTier[t]) {
        latestByTier[t] = d;
      }
    }
  }

  const maxInceptionDays = Math.max(
    0,
    Math.floor((todayTime - new Date(earliestDate + "T00:00:00Z").getTime()) / MS_PER_DAY)
  );

  const result: Record<TierLevel, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (let t = 1; t <= 5; t++) {
    const latest = latestByTier[t];
    if (!latest) {
      result[t as TierLevel] = maxInceptionDays;
    } else {
      const daysSince = Math.max(
        0,
        Math.floor((todayTime - new Date(latest + "T00:00:00Z").getTime()) / MS_PER_DAY)
      );
      result[t as TierLevel] = daysSince;
    }
  }

  // Pure Focus (L0) tracks days since any divergence (tier >= 1)
  result[0] = result[1];

  return result;
}
