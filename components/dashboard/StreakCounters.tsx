"use client";

import React from "react";
import { TIER_CONFIG, TierLevel } from "@/lib/types";

interface StreakCountersProps {
  streaks: Record<TierLevel, number>;
}

export function StreakCounters({ streaks }: StreakCountersProps) {
  const tiers: TierLevel[] = [0, 1, 2, 3, 4, 5];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiers.map((tier) => {
        const info = TIER_CONFIG[tier];
        const days = streaks[tier] ?? 0;
        const isClean = days > 0;

        return (
          <div
            key={tier}
            className={`relative rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
              tier === 0
                ? "bg-surface border-accent/30 hover:border-accent/60"
                : "bg-surface border-border hover:border-border-light"
            }`}
          >
            {/* Header with badge */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${info.colorClass}`}
              >
                {info.badge}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted font-mono">
                Streak
              </span>
            </div>

            {/* Streak Number */}
            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-main font-mono">
                  {days}
                </span>
                <span className="text-xs text-muted font-medium">
                  {days === 1 ? "day" : "days"}
                </span>
              </div>
              <p className="text-xs font-semibold text-main truncate mt-1">{info.title}</p>
            </div>

            {/* Reset Rule */}
            <div className="pt-2 border-t border-border/60 mt-1">
              <p className="text-[10.5px] text-muted leading-tight truncate">
                {info.resetImpact}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
