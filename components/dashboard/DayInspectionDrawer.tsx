"use client";

import React from "react";
import { DashboardIncident } from "@/app/actions/incidents";
import {
  formatDisplayDate,
  formatDuration,
  formatTimeOnly,
} from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import { X, Shield, Lock, Clock, Calendar, CheckCircle2 } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-lg bg-surface border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-surface-subtle border border-border text-accent">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-main">
                {formatDisplayDate(dateStr)}
              </h3>
              <p className="text-xs text-muted">Awake-Cycle Day Inspection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Day Status Summary Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              maxTier === 0
                ? "bg-accent/10 border-accent/30"
                : "bg-surface-subtle border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${maxTierInfo.colorClass}`}
              >
                {maxTierInfo.badge}
              </span>
              <div>
                <h4 className="text-sm font-bold text-main">{maxTierInfo.title}</h4>
                <p className="text-xs text-muted">
                  {maxTier === 0
                    ? "Protocol discipline fully maintained"
                    : `Peak daily operational tier`}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-mono font-bold text-main">{totalPoints}</div>
              <div className="text-[10px] text-muted uppercase font-mono">Net Points</div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-lg bg-surface-subtle border border-border">
              <div className="text-xs text-muted">Logged Events</div>
              <div className="text-xl font-mono font-bold text-main mt-0.5">
                {incidents.length}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface-subtle border border-border">
              <div className="text-xs text-muted">Defenses Deployed</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                {totalDefenses}
              </div>
            </div>
          </div>

          {/* Incident List for the Day */}
          {incidents.length === 0 ? (
            <div className="p-6 rounded-xl bg-surface-subtle/50 border border-dashed border-border text-center">
              <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-sm font-semibold text-main">Baseline Deep Work</p>
              <p className="text-xs text-muted mt-1">
                Zero divergence incidents logged. Protocol discipline remained at 100% efficiency.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h5 className="text-xs font-mono uppercase tracking-wider text-muted font-bold">
                Logged Telemetry Windows ({incidents.length})
              </h5>
              <div className="space-y-2">
                {incidents.map((inc) => {
                  const info = TIER_CONFIG[inc.tier_level as TierLevel];
                  return (
                    <div
                      key={inc.id}
                      className="p-3 rounded-lg bg-surface-subtle border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${info.colorClass}`}
                        >
                          {info.badge}
                        </span>
                        <div>
                          <div className="font-semibold text-main flex items-center gap-1.5">
                            <span>{info.title}</span>
                            <span className="text-[11px] font-mono text-muted">
                              ({formatDuration(inc.start_time, inc.end_time)})
                            </span>
                          </div>
                          <div className="text-[11px] text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeOnly(inc.start_time)} – {formatTimeOnly(inc.end_time)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-main">
                          {inc.points > 0 ? `+${inc.points} pts` : "0 pts"}
                        </div>
                        {inc.defense_occurred ? (
                          <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5 justify-end">
                            <Shield className="w-2.5 h-2.5" /> Defended
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted">Impulsive</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Privacy Callout */}
          <div className="p-3 rounded-lg bg-surface-subtle/80 border border-border text-[11px] text-muted flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p>
              <strong>Zero-Knowledge Day Inspection:</strong> Narrative reflections (pathway, context, impact) are write-only and encrypted via RSA-OAEP. They can only be accessed via the Coaching Export with Password 2.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-subtle/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface border border-border text-xs font-semibold text-main hover:bg-border/60 transition-colors"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
