"use client";

import React, { useState } from "react";
import { DashboardIncident, deleteIncident } from "@/app/actions/incidents";
import {
  formatDisplayDate,
  formatDuration,
  formatLocalDate,
  formatTimeOnly,
} from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import { Trash2, Shield, Zap, Calendar, Clock, AlertCircle } from "lucide-react";

interface IncidentLedgerProps {
  incidents: DashboardIncident[];
  onSelectDate: (dateStr: string, incidentsForDate: DashboardIncident[]) => void;
  onRefresh: () => void;
}

export function IncidentLedger({ incidents, onSelectDate, onRefresh }: IncidentLedgerProps) {
  const [filterTier, setFilterTier] = useState<number | "all">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredIncidents = incidents.filter((inc) => {
    if (filterTier === "all") return true;
    return inc.tier_level === filterTier;
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this telemetry record?")) return;

    setDeletingId(id);
    try {
      await deleteIncident(id);
      onRefresh();
    } catch (err) {
      alert("Failed to delete record");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4 md:p-5 flex flex-col gap-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-sm font-bold text-main flex items-center gap-2">
            <span>Telemetry Ledger</span>
            <span className="text-xs font-normal text-muted">
              ({filteredIncidents.length} record{filteredIncidents.length === 1 ? "" : "s"})
            </span>
          </h2>
          <p className="text-xs text-muted">
            Strict chronological sequencing ordered by ingest timestamp. Narrative reflections remain write-only.
          </p>
        </div>

        {/* Tier filter pill buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setFilterTier("all")}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
              filterTier === "all"
                ? "bg-accent/20 text-accent border border-accent/40"
                : "bg-surface-subtle text-muted border border-border hover:border-border-light"
            }`}
          >
            All
          </button>
          {([1, 2, 3, 4, 5] as TierLevel[]).map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                filterTier === tier
                  ? `${TIER_CONFIG[tier].colorClass} ring-1 ring-white/20`
                  : "bg-surface-subtle text-muted/80 border border-border hover:text-main"
              }`}
            >
              L{tier}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      {filteredIncidents.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center px-4">
          <div className="w-12 h-12 rounded-full bg-surface-subtle border border-border flex items-center justify-center mb-3 text-accent">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-main">Protocol Discipline Intact</h3>
          <p className="text-xs text-muted max-w-sm mt-1">
            Zero divergence events recorded for this view. Flow state is implicitly maintained at Level 0 (Pure Focus).
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {filteredIncidents.map((incident) => {
            const tierInfo = TIER_CONFIG[incident.tier_level as TierLevel];
            const startDate = new Date(incident.start_time);
            const calendarDate = formatLocalDate(startDate);
            const isAwakeCycleShifted = calendarDate !== incident.logical_date;

            return (
              <div
                key={incident.id}
                onClick={() => {
                  const dayIncidents = incidents.filter(
                    (i) => i.logical_date === incident.logical_date
                  );
                  onSelectDate(incident.logical_date, dayIncidents);
                }}
                className="py-3 px-2 -mx-2 rounded-lg hover:bg-surface-subtle/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left cluster: Tier badge & details */}
                <div className="flex items-start sm:items-center gap-3">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded shrink-0 ${tierInfo.colorClass}`}
                  >
                    {tierInfo.badge}
                  </span>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-main">
                        {tierInfo.title}
                      </span>
                      <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeOnly(incident.start_time)} – {formatTimeOnly(incident.end_time)}
                      </span>
                      <span className="text-[11px] font-mono px-1.5 py-0.2 bg-surface-subtle border border-border/80 rounded text-muted">
                        {formatDuration(incident.start_time, incident.end_time)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted/70" />
                        {formatDisplayDate(incident.logical_date)}
                      </span>

                      {isAwakeCycleShifted && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                          Awake-cycle: Late night
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right cluster: Modifiers, Points & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-11 sm:pl-0">
                  {/* Defense / Surge status */}
                  {incident.defense_occurred ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      <Shield className="w-3 h-3" />
                      Defended (-{incident.tier_level === 1 ? 1 : 2} pts)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted bg-surface-subtle border border-border px-2 py-0.5 rounded">
                      <Zap className="w-3 h-3 text-amber-400" />
                      Surge
                    </span>
                  )}

                  {/* Points */}
                  <span className="text-xs font-mono font-bold text-main min-w-[50px] text-right">
                    {incident.points > 0 ? `+${incident.points} pts` : "0 pts"}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(incident.id, e)}
                    disabled={deletingId === incident.id}
                    title="Delete telemetry record"
                    className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
