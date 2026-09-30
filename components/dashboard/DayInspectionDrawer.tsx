"use client";

import React, { useMemo } from "react";
import { DashboardIncident } from "@/app/actions/incidents";
import {
  formatDisplayDate,
  formatDuration,
  formatLocalDate,
  formatTimeOnly,
} from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import { X, Clock, CheckCircle2, Shield, Moon } from "lucide-react";

interface DayInspectionDrawerProps {
  dateStr: string | null;
  incidents: DashboardIncident[];
  onClose: () => void;
}

export function DayInspectionDrawer({
  dateStr,
  incidents,
  onClose,
}: DayInspectionDrawerProps) {
  if (!dateStr) return null;

  const sortedIncidents = useMemo(() => {
    return [...incidents].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [incidents]);

  const maxTier =
    sortedIncidents.length > 0
      ? (Math.max(...sortedIncidents.map((i) => i.tier_level)) as TierLevel)
      : 0;
  const maxTierInfo = TIER_CONFIG[maxTier];
  const totalPoints = sortedIncidents.reduce((sum, i) => sum + i.points, 0);
  const totalDefenses = sortedIncidents.filter((i) => i.defense_occurred).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full sm:max-w-md bg-surface border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-main">
            {formatDisplayDate(dateStr)}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-main hover:bg-surface-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3">
          {/* Status Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              maxTier === 0
                ? "bg-accent/10 border-accent/30"
                : "bg-surface-subtle border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${maxTierInfo.colorClass}`}
              >
                {maxTierInfo.badge}
              </span>
              <div>
                <h4 className="text-sm font-bold text-main">{maxTierInfo.title}</h4>
                <p className="text-xs text-muted">
                  {maxTier === 0 ? "Pure focus" : `Peak tier: L${maxTier}`}
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-lg font-bold text-main">{totalPoints}</div>
              <div className="text-xs text-muted uppercase">pts</div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border">
              <div className="text-xs text-muted">Events</div>
              <div className="text-lg font-mono font-bold text-main mt-0.5">
                {sortedIncidents.length}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border">
              <div className="text-xs text-muted">Defended</div>
              <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                {totalDefenses}
              </div>
            </div>
          </div>

          {/* Incident List (Most Recent at Top) */}
          {sortedIncidents.length === 0 ? (
            <div className="py-5 text-center text-xs text-muted">
              <CheckCircle2 className="w-5 h-5 text-accent mx-auto mb-1" />
              <span>No incidents logged.</span>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              {sortedIncidents.map((inc) => {
                const info = TIER_CONFIG[inc.tier_level as TierLevel];
                const startDate = new Date(inc.start_time);
                const calendarDate = formatLocalDate(startDate);
                const isAwakeCycleShifted = calendarDate !== inc.logical_date;

                return (
                  <div
                    key={inc.id}
                    className="p-2.5 rounded-lg bg-surface-subtle border border-border flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${info.colorClass}`}
                      >
                        L{inc.tier_level}
                      </span>
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-main truncate text-sm">
                          {info.title}{" "}
                          <span className="text-xs font-mono text-muted font-normal">
                            ({formatDuration(inc.start_time, inc.end_time)})
                          </span>
                        </div>
                        <div className="text-xs text-muted flex items-center gap-2 font-mono flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeOnly(inc.start_time)} – {formatTimeOnly(inc.end_time)}
                          </span>
                          {isAwakeCycleShifted && (
                            <span className="text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded flex items-center gap-1 text-[11px]">
                              <Moon className="w-3 h-3" />
                              <span>Late night</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-main text-sm">
                        {inc.points > 0 ? `+${inc.points}` : "0"}
                      </div>
                      {inc.defense_occurred ? (
                        <div className="text-xs text-emerald-400 font-mono flex items-center gap-1 justify-end">
                          <Shield className="w-3 h-3" />
                          <span>Defended</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-surface-subtle/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-main hover:bg-border/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
