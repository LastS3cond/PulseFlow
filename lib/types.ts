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

export interface NarrativePayload {
  pathway: string;
  context: string;
  impact: string;
}

export interface IngestIncidentRow {
  logical_date?: string;
  start_time: string;
  end_time: string;
  tier_level: number;
  defense_occurred: boolean;
  surge_occurred?: boolean;
  points?: number;
  pathway?: string;
  context?: string;
  impact?: string;
}

export interface TierInfo {
  level: TierLevel;
  badge: string;
  title: string;
  definition: string;
  basePoints: number;
  resetImpact: string;
  colorClass: string;
  dotColor: string;
}

export const TIER_CONFIG: Record<TierLevel, TierInfo> = {
  0: {
    level: 0,
    badge: "⬜ L0",
    title: "Pure Focus",
    definition: "Baseline deep work; uninterrupted workflow, zero unapproved drift.",
    basePoints: 0,
    resetImpact: "None (Implicit daily baseline)",
    colorClass: "badge-tier-0",
    dotColor: "#27272a",
  },
  1: {
    level: 1,
    badge: "🟨 L1",
    title: "Peripheral Drift",
    definition: "Passive browsing, feed checks, brief video previews, curiosity clicks.",
    basePoints: 1,
    resetImpact: "Resets L1",
    colorClass: "badge-tier-1",
    dotColor: "#facc15",
  },
  2: {
    level: 2,
    badge: "🟧 L2",
    title: "Soft Divergence",
    definition: "Secondary entertainment media, long-form reading, extended loops.",
    basePoints: 3,
    resetImpact: "Resets L2 & L1",
    colorClass: "badge-tier-2",
    dotColor: "#fb923c",
  },
  3: {
    level: 3,
    badge: "🟥 L3",
    title: "Direct Compromise",
    definition: "High-friction distraction sites, unapproved apps, workflow break.",
    basePoints: 10,
    resetImpact: "Resets L3, L2, & L1",
    colorClass: "badge-tier-3",
    dotColor: "#f87171",
  },
  4: {
    level: 4,
    badge: "🟪 L4",
    title: "Deep Pipeline Drift",
    definition: "Compulsive loops, non-standard browsing, total task abandonment.",
    basePoints: 50,
    resetImpact: "Resets L4, L3, L2, & L1",
    colorClass: "badge-tier-4",
    dotColor: "#c084fc",
  },
  5: {
    level: 5,
    badge: "⬛ L5",
    title: "System Reset",
    definition: "Catastrophic protocol breakdown; multi-hour executive burnout.",
    basePoints: 1000,
    resetImpact: "Resets all tier streaks to 0",
    colorClass: "badge-tier-5",
    dotColor: "#ef4444",
  },
};
