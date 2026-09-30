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
import { Trash2, Shield, Zap, Clock, CheckCircle2 } from "lucide-react";

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
    if (!confirm("Delete this entry?")) return;

    setDeletingId(id);
    try {
      await deleteIncident(id);
      onRefresh();
    } catch {
      alert("Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-3.5 sm:p-4 flex flex-col gap-3">
      {/* Header & Filter Controls */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-bold">
            History
          </h2>
          <span className="text-[11px] font-mono text-muted">
            ({filteredIncidents.length})
          </span>
        </div>

        {/* Tier filter pill buttons */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <button
            onClick={() => setFilterTier("all")}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
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
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
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
          <CheckCircle2 className="w-6 h-6 text-accent mb-1.5" />
          <p className="text-xs font-semibold text-main">Discipline Intact</p>
          <p className="text-[11px] text-muted mt-0.5">
            No incidents recorded. Pure focus baseline maintained.
          </p>
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
                  const dayIncidents = incidents.filter(
                    (i) => i.logical_date === incident.logical_date
                  );
                  onSelectDate(incident.logical_date, dayIncidents);
                }}
                className="py-2.5 px-1.5 -mx-1.5 rounded-lg hover:bg-surface-subtle/60 transition-colors cursor-pointer flex items-center justify-between gap-2.5"
              >
                {/* Left cluster */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${tierInfo.colorClass}`}
                  >
                    L{incident.tier_level}
                  </span>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-main truncate">
                        {tierInfo.title}
                      </span>
                      <span className="text-[11px] font-mono text-muted">
                        {formatDuration(incident.start_time, incident.end_time)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10.5px] text-muted truncate">
                      <span>{formatDisplayDate(incident.logical_date)}</span>
                      <span className="font-mono">
                        {formatTimeOnly(incident.start_time)}
                      </span>
                      {isAwakeCycleShifted && (
                        <span className="text-[9.5px] font-mono px-1 rounded bg-amber-500/10 text-amber-400">
                          Late night
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right cluster */}
                <div className="flex items-center gap-2 shrink-0">
                  {incident.defense_occurred ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      <Shield className="w-2.5 h-2.5" /> Defended
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted flex items-center gap-0.5 bg-surface-subtle px-1.5 py-0.5 rounded">
                      <Zap className="w-2.5 h-2.5 text-amber-400" /> Surge
                    </span>
                  )}

                  <span className="text-xs font-mono font-bold text-main min-w-[36px] text-right">
                    {incident.points > 0 ? `+${incident.points}` : "0"}
                  </span>

                  <button
                    onClick={(e) => handleDelete(incident.id, e)}
                    disabled={deletingId === incident.id}
                    title="Delete"
                    className="p-1 rounded text-muted hover:text-red-400 transition-colors"
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
