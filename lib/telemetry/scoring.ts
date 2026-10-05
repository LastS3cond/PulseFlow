import { TIER_CONFIG, TierLevel } from "../types";

/**
 * Calculates net points based on tier level and binary defense.
 * - L1: 1 pt - 1 pt defense = 0 pts
 * - L2-L5: base - 2 pts defense
 */
export function calculateIncidentPoints(tierLevel: number, defenseOccurred: boolean): number {
  const base = TIER_CONFIG[tierLevel as TierLevel]?.basePoints ?? 0;
  if (!defenseOccurred) return base;
  return tierLevel === 1 ? Math.max(0, base - 1) : Math.max(0, base - 2);
}

export function deriveSurgeOccurred(defenseOccurred: boolean): boolean {
  return !defenseOccurred;
}

export interface StreakInfo {
  days: number;
  hours: number;
  totalHours: number;
}

/**
 * Calculates progress / time since last incident for each tier level.
 * Tracks elapsed duration (days and hours) since the latest incident affecting that tier.
 * Tiers reset on incidents with tier_level >= tier.
 * L0 (Pure Focus) tracks time since any incident (tier >= 1).
 */
export function calculateStreaks(
  incidents: Array<{
    logical_date: string;
    tier_level: number;
    start_time?: string;
    end_time?: string;
  }>,
  todayDateStr?: string,
  inceptionDateStr?: string,
  nowMs: number = Date.now()
): Record<TierLevel, StreakInfo> {
  let inceptionTime = inceptionDateStr ? new Date(inceptionDateStr).getTime() : nowMs;
  if (isNaN(inceptionTime)) inceptionTime = nowMs;

  // Track latest incident timestamp that resets each tier
  const latestTimeByTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (let i = 0; i < incidents.length; i++) {
    const inc = incidents[i];
    const timeStr = inc.end_time || inc.start_time;
    let incTime = timeStr ? new Date(timeStr).getTime() : NaN;
    if (isNaN(incTime)) {
      incTime = new Date(`${inc.logical_date}T12:00:00`).getTime();
    }

    if (!isNaN(incTime)) {
      if (incTime < inceptionTime) {
        inceptionTime = incTime;
      }
      // For any tier <= inc.tier_level, this incident resets that tier's streak
      const maxTier = Math.min(5, Math.max(1, inc.tier_level));
      for (let t = 1; t <= maxTier; t++) {
        if (incTime > latestTimeByTier[t]) {
          latestTimeByTier[t] = incTime;
        }
      }
    }
  }

  const result: Record<TierLevel, StreakInfo> = {
    0: { days: 0, hours: 0, totalHours: 0 },
    1: { days: 0, hours: 0, totalHours: 0 },
    2: { days: 0, hours: 0, totalHours: 0 },
    3: { days: 0, hours: 0, totalHours: 0 },
    4: { days: 0, hours: 0, totalHours: 0 },
    5: { days: 0, hours: 0, totalHours: 0 },
  };

  for (let t = 1; t <= 5; t++) {
    const refTime = latestTimeByTier[t] > 0 ? latestTimeByTier[t] : inceptionTime;
    const diffMs = Math.max(0, nowMs - refTime);
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    result[t as TierLevel] = { days, hours, totalHours };
  }

  // Pure Focus (L0) tracks days/hours since any divergence (tier >= 1)
  result[0] = { ...result[1] };

  return result;
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface MacroStats {
  totalWeeks: number;
  totalMonths: number;
  totalIncidents: number;
  totalPoints: number;
  avgWeeklyIncidentsNum: number;
  avgMonthlyIncidentsNum: number;
  avgWeeklyIncidents: string;
  avgWeeklyPoints: string;
  medianWeeklyPoints: number;
  medianMonthlyPoints: number;
  tierWeeklyAverages: Record<number, string>;
  tierMonthlyAverages: Record<number, string>;
  tierCounts: Record<number, number>;
}

export function computeMacroStats(
  incidents: Array<{ logical_date: string; tier_level: number; points: number }>,
  inceptionDate?: string
): MacroStats {
  const today = new Date();
  let start = inceptionDate ? new Date(inceptionDate) : today;
  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalPoints = 0;

  for (let i = 0; i < incidents.length; i++) {
    const inc = incidents[i];
    if (tierCounts[inc.tier_level] !== undefined) tierCounts[inc.tier_level]++;
    totalPoints += inc.points;
    const d = new Date(inc.logical_date);
    if (d < start) start = d;
  }

  const diffMs = Math.max(0, today.getTime() - start.getTime());
  const totalWeeks = Math.max(1, Math.ceil(diffMs / 604800000));
  const totalMonths = Math.max(
    1,
    (today.getFullYear() - start.getFullYear()) * 12 +
      (today.getMonth() - start.getMonth()) +
      1
  );

  // Build timeline maps to compute median points per week and month (Option B)
  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - today.getDay());
  currentSunday.setHours(0, 0, 0, 0);

  const startSunday = new Date(start);
  startSunday.setDate(start.getDate() - start.getDay());
  startSunday.setHours(0, 0, 0, 0);

  const weekPointsMap = new Map<string, number>();
  const iterW = new Date(startSunday);
  while (iterW <= currentSunday) {
    const key = `${iterW.getFullYear()}-${String(iterW.getMonth() + 1).padStart(2, "0")}-${String(iterW.getDate()).padStart(2, "0")}`;
    weekPointsMap.set(key, 0);
    iterW.setDate(iterW.getDate() + 7);
  }

  const monthPointsMap = new Map<string, number>();
  const iterM = new Date(start.getFullYear(), start.getMonth(), 1);
  const endM = new Date(today.getFullYear(), today.getMonth(), 1);
  while (iterM <= endM) {
    const mKey = `${iterM.getFullYear()}-${String(iterM.getMonth() + 1).padStart(2, "0")}`;
    monthPointsMap.set(mKey, 0);
    iterM.setMonth(iterM.getMonth() + 1);
  }

  for (let i = 0; i < incidents.length; i++) {
    const inc = incidents[i];
    const [y, m, d] = inc.logical_date.split("-").map(Number);
    const incDate = new Date(y, m - 1, d);
    incDate.setDate(incDate.getDate() - incDate.getDay());
    const wKey = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, "0")}-${String(incDate.getDate()).padStart(2, "0")}`;
    if (weekPointsMap.has(wKey)) {
      weekPointsMap.set(wKey, (weekPointsMap.get(wKey) || 0) + inc.points);
    }
    const mKey = inc.logical_date.slice(0, 7);
    if (monthPointsMap.has(mKey)) {
      monthPointsMap.set(mKey, (monthPointsMap.get(mKey) || 0) + inc.points);
    }
  }

  const medianWeeklyPoints = computeMedian(Array.from(weekPointsMap.values()));
  const medianMonthlyPoints = computeMedian(Array.from(monthPointsMap.values()));

  const tierWeeklyAverages: Record<number, string> = {};
  const tierMonthlyAverages: Record<number, string> = {};
  for (let t = 1; t <= 5; t++) {
    tierWeeklyAverages[t] = (tierCounts[t] / totalWeeks).toFixed(1);
    tierMonthlyAverages[t] = (tierCounts[t] / totalMonths).toFixed(1);
  }

  const totalIncidents = incidents.length;
  return {
    totalWeeks,
    totalMonths,
    totalIncidents,
    totalPoints,
    avgWeeklyIncidentsNum: totalIncidents / totalWeeks,
    avgMonthlyIncidentsNum: totalIncidents / totalMonths,
    avgWeeklyIncidents: (totalIncidents / totalWeeks).toFixed(1),
    avgWeeklyPoints: medianWeeklyPoints.toFixed(1),
    medianWeeklyPoints,
    medianMonthlyPoints,
    tierWeeklyAverages,
    tierMonthlyAverages,
    tierCounts,
  };
}
