"use client";

import React from "react";
import { DashboardIncident } from "@/app/actions/incidents";
import {
  formatDisplayDate,
  formatDuration,
  formatTimeOnly,
} from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import { X, Shield, Clock, CheckCircle2 } from "lucide-react";

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

  const maxTier =
    incidents.length > 0
      ? (Math.max(...incidents.map((i) => i.tier_level)) as TierLevel)
      : 0;
  const maxTierInfo = TIER_CONFIG[maxTier];
  const totalPoints = incidents.reduce((sum, i) => sum + i.points, 0);
  const totalDefenses = incidents.filter((i) => i.defense_occurred).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full sm:max-w-md bg-surface border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-main">
              {formatDisplayDate(dateStr)}
            </h3>
          </div>
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
            <div className="flex items-center gap-2.5">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${maxTierInfo.colorClass}`}
              >
                {maxTierInfo.badge}
              </span>
              <div>
                <h4 className="text-xs font-bold text-main">{maxTierInfo.title}</h4>
                <p className="text-[11px] text-muted">
                  {maxTier === 0 ? "Pure focus maintained" : `Peak tier: L${maxTier}`}
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-base font-bold text-main">{totalPoints}</div>
              <div className="text-[10px] text-muted uppercase">pts</div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border">
              <div className="text-[11px] text-muted">Events</div>
              <div className="text-lg font-mono font-bold text-main mt-0.5">
                {incidents.length}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border">
              <div className="text-[11px] text-muted">Defended</div>
              <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                {totalDefenses}
              </div>
            </div>
          </div>

          {/* Incident List */}
          {incidents.length === 0 ? (
            <div className="py-5 text-center text-xs text-muted">
              <CheckCircle2 className="w-5 h-5 text-accent mx-auto mb-1" />
              <span>Zero divergence events. Focus intact.</span>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              {incidents.map((inc) => {
                const info = TIER_CONFIG[inc.tier_level as TierLevel];
                return (
                  <div
                    key={inc.id}
                    className="p-2.5 rounded-lg bg-surface-subtle border border-border flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${info.colorClass}`}
                      >
                        L{inc.tier_level}
                      </span>
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-main truncate">
                          {info.title}{" "}
                          <span className="text-[10.5px] font-mono text-muted font-normal">
                            ({formatDuration(inc.start_time, inc.end_time)})
                          </span>
                        </div>
                        <div className="text-[10.5px] text-muted flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimeOnly(inc.start_time)} – {formatTimeOnly(inc.end_time)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-main">
                        {inc.points > 0 ? `+${inc.points}` : "0"}
                      </div>
                      {inc.defense_occurred ? (
                        <div className="text-[9.5px] text-emerald-400 font-medium">Defended</div>
                      ) : (
                        <div className="text-[9.5px] text-muted">Surge</div>
                      )}
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
            className="px-3 py-1 rounded-lg bg-surface border border-border text-xs text-main hover:bg-border/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
