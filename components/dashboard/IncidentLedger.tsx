"use client";

import React, { useState, useMemo } from "react";
import { DashboardIncident } from "@/app/actions/incidents";
import {
  formatDisplayDate,
  formatDuration,
  formatLocalDate,
  formatTimeOnly,
} from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import { CheckCircle2, Shield, Moon } from "lucide-react";

interface IncidentLedgerProps {
  incidents: DashboardIncident[];
  onSelectDate: (dateStr: string, incidentsForDate: DashboardIncident[]) => void;
  onRefresh?: () => void;
}

export function IncidentLedger({ incidents, onSelectDate }: IncidentLedgerProps) {
  const [filterTier, setFilterTier] = useState<number | "all">("all");

  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((inc) => {
        if (filterTier === "all") return true;
        return inc.tier_level === filterTier;
      })
      .sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
  }, [incidents, filterTier]);

  return (
    <div className="bg-surface rounded-xl border border-border p-3.5 flex flex-col gap-3">
      {/* Header & Filter Controls */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-bold">
            History
          </h2>
          <span className="text-xs font-mono text-muted">
            ({filteredIncidents.length})
          </span>
        </div>

        {/* Tier filter pill buttons */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <button
            onClick={() => setFilterTier("all")}
            className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
              filterTier === "all"
                ? "bg-accent text-zinc-950 font-bold"
                : "bg-surface-subtle text-muted hover:text-main"
            }`}
          >
            All
          </button>
          {([1, 2, 3, 4, 5] as TierLevel[]).map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                filterTier === tier
                  ? `${TIER_CONFIG[tier].colorClass} ring-1 ring-white/20`
                  : "bg-surface-subtle text-muted hover:text-main"
              }`}
            >
              L{tier}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      {filteredIncidents.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center px-4">
          <CheckCircle2 className="w-5 h-5 text-accent mb-1" />
          <p className="text-xs font-semibold text-main">No incidents logged.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/50">
          {filteredIncidents.map((incident) => {
            const tierInfo = TIER_CONFIG[incident.tier_level as TierLevel];
            const startDate = new Date(incident.start_time);
            const calendarDate = formatLocalDate(startDate);
            const isAwakeCycleShifted = calendarDate !== incident.logical_date;

            return (
              <div
                key={incident.id}
                onClick={() => {
                  const dayIncidents = incidents
                    .filter((i) => i.logical_date === incident.logical_date)
                    .sort(
                      (a, b) =>
                        new Date(b.start_time).getTime() -
                        new Date(a.start_time).getTime()
                    );
                  onSelectDate(incident.logical_date, dayIncidents);
                }}
                className="py-2.5 px-1.5 -mx-1.5 rounded-lg hover:bg-surface-subtle/60 transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                {/* Left cluster */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${tierInfo.colorClass}`}
                  >
                    L{incident.tier_level}
                  </span>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-main truncate">
                        {tierInfo.title}
                      </span>
                      <span className="text-xs font-mono text-muted">
                        {formatDuration(incident.start_time, incident.end_time)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted truncate">
                      <span>{formatDisplayDate(incident.logical_date)}</span>
                      <span className="font-mono">
                        {formatTimeOnly(incident.start_time)}
                      </span>
                      {isAwakeCycleShifted && (
                        <span
                          title="Late night (awake-cycle shifted)"
                          className="text-amber-400 flex items-center"
                        >
                          <Moon className="w-3.5 h-3.5 fill-amber-400/20" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right cluster */}
                <div className="flex items-center gap-2 shrink-0">
                  {incident.defense_occurred && (
                    <span
                      title="Defended"
                      className="p-1 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center"
                    >
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  )}

                  <span className="text-sm font-mono font-bold text-main min-w-[36px] text-right">
                    {incident.points > 0 ? `+${incident.points}` : "0"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
