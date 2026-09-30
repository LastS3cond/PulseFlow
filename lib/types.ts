export type TierLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface Incident {
  id: string;
  created_at: string;
  logical_date: string; // YYYY-MM-DD
  start_time: string;   // ISO string (TIMESTAMPTZ)
  end_time: string;     // ISO string (TIMESTAMPTZ)
  tier_level: 1 | 2 | 3 | 4 | 5;
  defense_occurred: boolean;
  surge_occurred: boolean;
  points: number;
  encrypted_narrative: string;
}

export interface VaultConfig {
  id: string;
  public_key_spki: string;
  encrypted_private_key: string;
  salt: string;
  created_at: string;
}

export interface TierInfo {
  level: TierLevel;
  badge: string;
  title: string;
  definition: string;
  basePoints: number;
  resetImpact: string;
  colorClass: string;
}

export const TIER_CONFIG: Record<TierLevel, TierInfo> = {
  0: {
    level: 0,
    badge: "⬜ L0",
    title: "Pure Focus",
    definition: "Baseline deep work; uninterrupted workflow, zero drift.",
    basePoints: 0,
    resetImpact: "None",
    colorClass: "badge-tier-0",
  },
  1: {
    level: 1,
    badge: "🟨 L1",
    title: "Drift",
    definition: "Passive browsing, feed checks, brief curiosity clicks.",
    basePoints: 1,
    resetImpact: "Resets L1",
    colorClass: "badge-tier-1",
  },
  2: {
    level: 2,
    badge: "🟧 L2",
    title: "Detour",
    definition: "Secondary media, long-form reading, extended loops.",
    basePoints: 3,
    resetImpact: "Resets L2 & L1",
    colorClass: "badge-tier-2",
  },
  3: {
    level: 3,
    badge: "🟥 L3",
    title: "Direct",
    definition: "Intentional visit, high-risk destination, immediate boundary break.",
    basePoints: 10,
    resetImpact: "Resets L3, L2, & L1",
    colorClass: "badge-tier-3",
  },
  4: {
    level: 4,
    badge: "🟪 L4",
    title: "Deep Spiral",
    definition: "Compulsive loops, extended sessions, total task abandonment.",
    basePoints: 50,
    resetImpact: "Resets L4, L3, L2, & L1",
    colorClass: "badge-tier-4",
  },
  5: {
    level: 5,
    badge: "⬛ L5",
    title: "System Reset",
    definition: "Catastrophic protocol breakdown, session boundary collapse.",
    basePoints: 1000,
    resetImpact: "Resets all streaks",
    colorClass: "badge-tier-5",
  },
};
