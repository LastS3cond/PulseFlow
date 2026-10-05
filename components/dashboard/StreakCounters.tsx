"use client";

import React, { useState } from "react";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import { StreakInfo } from "@/lib/telemetry/scoring";

interface StreakCountersProps {
  streaks: Record<TierLevel, StreakInfo | number>;
}

export function StreakCounters({ streaks }: StreakCountersProps) {
  const tiers: TierLevel[] = [0, 1, 2, 3, 4, 5];
  const [toggledTiers, setToggledTiers] = useState<Record<number, boolean>>({});

  const toggleTier = (tier: TierLevel) => {
    setToggledTiers((prev) => ({
      ...prev,
      [tier]: !prev[tier],
    }));
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
        {tiers.map((tier) => {
          const info = TIER_CONFIG[tier];
          const val = streaks[tier];
          const days = typeof val === "number" ? val : val?.days ?? 0;
          const hours = typeof val === "number" ? 0 : val?.hours ?? 0;

          // Default: show hours for single digits (< 10 days), hide hours for double digits (>= 10 days)
          const isDoubleDigits = days >= 10;
          const defaultShowHours = !isDoubleDigits;
          const isToggled = toggledTiers[tier] ?? false;
          const showHours = isToggled ? !defaultShowHours : defaultShowHours;

          return (
            <div
              key={tier}
              onClick={() => toggleTier(tier)}
              title={`${info.badge} ${info.title}: ${days}d ${hours}h since last incident (click to toggle)`}
              className={`rounded-lg border px-2 sm:px-2.5 py-1.5 flex items-center justify-between transition-all cursor-pointer hover:bg-surface-subtle active:scale-[0.98] select-none ${
                tier === 0
                  ? "bg-surface border-accent/30 hover:border-accent/50"
                  : "bg-surface border-border hover:border-border-light"
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <span
                  className={`text-xs font-mono font-bold px-1 rounded shrink-0 ${info.colorClass}`}
                >
                  L{tier}
                </span>
                <span className="text-xs text-muted truncate hidden min-[480px]:inline">
                  {tier === 0 ? "Focus" : info.title.split(" ")[0]}
                </span>
              </div>

              <div className="flex items-baseline font-mono shrink-0">
                <span className="text-xs sm:text-sm font-extrabold text-main">{days}</span>
                <span className="text-[10px] sm:text-xs text-muted">d</span>
                {showHours && (
                  <>
                    <span className="text-xs sm:text-sm font-extrabold text-main ml-1">{hours}</span>
                    <span className="text-[10px] sm:text-xs text-muted">h</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
