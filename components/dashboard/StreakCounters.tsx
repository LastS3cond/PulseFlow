"use client";

import React from "react";
import { TIER_CONFIG, TierLevel } from "@/lib/types";

interface StreakCountersProps {
  streaks: Record<TierLevel, number>;
}

export function StreakCounters({ streaks }: StreakCountersProps) {
  const tiers: TierLevel[] = [0, 1, 2, 3, 4, 5];

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
        {tiers.map((tier) => {
          const info = TIER_CONFIG[tier];
          const days = streaks[tier] ?? 0;

          return (
            <div
              key={tier}
              title={`${info.badge} ${info.title}: ${days} consecutive days`}
              className={`rounded-lg border px-2.5 py-1.5 flex items-center justify-between transition-colors ${
                tier === 0
                  ? "bg-surface border-accent/30"
                  : "bg-surface border-border hover:border-border-light"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-mono font-bold px-1 rounded ${info.colorClass}`}
                >
                  L{tier}
                </span>
                <span className="text-xs text-muted truncate max-w-[45px] sm:max-w-none hidden xs:inline">
                  {tier === 0 ? "Focus" : info.title.split(" ")[0]}
                </span>
              </div>

              <div className="flex items-baseline gap-0.5 font-mono">
                <span className="text-sm font-extrabold text-main">{days}</span>
                <span className="text-xs text-muted">d</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
