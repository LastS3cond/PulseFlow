"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DashboardIncident,
  updateIncident,
  deleteIncident,
} from "@/app/actions/incidents";
import {
  formatDisplayDate,
  formatDuration,
  formatTimeOnly,
  isLateNight,
  resolveIncidentTimestamps,
  toTimeInputValue,
} from "@/lib/telemetry/time";
import {
  calculateIncidentPoints,
  deriveSurgeOccurred,
} from "@/lib/telemetry/scoring";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import {
  X,
  Clock,
  CheckCircle2,
  Shield,
  Moon,
  Pencil,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface DayInspectionDrawerProps {
  dateStr: string | null;
  incidents: DashboardIncident[];
  onClose: () => void;
  onRefresh?: () => void;
}

interface EditFormState {
  date: string;
  startTime: string;
  endTime: string;
  tier: 1 | 2 | 3 | 4 | 5;
  defended: boolean;
}

export function DayInspectionDrawer({
  dateStr,
  incidents,
  onClose,
  onRefresh,
}: DayInspectionDrawerProps) {
  const [localIncidents, setLocalIncidents] = useState<DashboardIncident[]>(incidents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<EditFormState>({
    date: "",
    startTime: "",
    endTime: "",
    tier: 1,
    defended: false,
  });

  useEffect(() => {
    setLocalIncidents(incidents);
    setEditingId(null);
    setConfirmDeleteId(null);
    setActionError(null);
  }, [incidents, dateStr]);

  const sortedIncidents = useMemo(() => {
    return [...localIncidents].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [localIncidents]);

  if (!dateStr) return null;

  const maxTier =
    sortedIncidents.length > 0
      ? (Math.max(...sortedIncidents.map((i) => i.tier_level)) as TierLevel)
      : 0;
  const maxTierInfo = TIER_CONFIG[maxTier];
  const totalPoints = sortedIncidents.reduce((sum, i) => sum + i.points, 0);
  const totalDefenses = sortedIncidents.filter((i) => i.defense_occurred).length;

  const startEditing = (inc: DashboardIncident) => {
    setConfirmDeleteId(null);
    setActionError(null);
    setEditingId(inc.id);
    setEditForm({
      date: inc.logical_date,
      startTime: toTimeInputValue(inc.start_time),
      endTime: toTimeInputValue(inc.end_time),
      tier: inc.tier_level as 1 | 2 | 3 | 4 | 5,
      defended: inc.defense_occurred,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.startTime || !editForm.endTime || !editForm.date) {
      setActionError("Date and times are required.");
      return;
    }

    setIsSaving(true);
    setActionError(null);

    try {
      const { startObj, endObj } = resolveIncidentTimestamps(
        editForm.date,
        editForm.startTime,
        editForm.endTime
      );
      const points = calculateIncidentPoints(editForm.tier, editForm.defended);
      const surge = deriveSurgeOccurred(editForm.defended);

      const result = await updateIncident(id, {
        logical_date: editForm.date,
        start_time: startObj.toISOString(),
        end_time: endObj.toISOString(),
        tier_level: editForm.tier,
        defense_occurred: editForm.defended,
        surge_occurred: surge,
        points,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update incident");
      }

      if (editForm.date !== dateStr) {
        // If moved to a different day, remove from current day inspection
        setLocalIncidents((prev) => prev.filter((i) => i.id !== id));
      } else {
        setLocalIncidents((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  logical_date: editForm.date,
                  start_time: startObj.toISOString(),
                  end_time: endObj.toISOString(),
                  tier_level: editForm.tier,
                  defense_occurred: editForm.defended,
                  surge_occurred: surge,
                  points,
                }
              : i
          )
        );
      }

      setEditingId(null);
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setActionError(null);

    try {
      const result = await deleteIncident(id);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete incident");
      }

      setLocalIncidents((prev) => prev.filter((i) => i.id !== id));
      setConfirmDeleteId(null);
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.message || "Failed to delete incident");
    } finally {
      setIsDeleting(false);
    }
  };

  const editLivePoints = calculateIncidentPoints(editForm.tier, editForm.defended);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 pb-5 sm:pb-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full sm:max-w-md bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
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
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 pb-5">
          {actionError && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

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

          {/* Incident List */}
          {sortedIncidents.length === 0 ? (
            <div className="py-5 text-center text-xs text-muted">
              <CheckCircle2 className="w-5 h-5 text-accent mx-auto mb-1" />
              <span>No incidents logged.</span>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {sortedIncidents.map((inc) => {
                const isEditing = editingId === inc.id;
                const info = TIER_CONFIG[inc.tier_level as TierLevel];

                if (isEditing) {
                  return (
                    <div
                      key={inc.id}
                      className="p-3 rounded-xl bg-surface-subtle border border-accent/40 shadow-md space-y-2.5 text-xs animate-in fade-in"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                        <span className="font-mono font-bold uppercase text-accent tracking-wider text-[11px]">
                          Edit Incident
                        </span>
                        <span className="font-mono font-bold text-main text-xs">
                          {editLivePoints > 0 ? `+${editLivePoints} pts` : "0 pts"}
                        </span>
                      </div>

                      {/* Tier Selector */}
                      <div>
                        <label className="block text-[11px] font-mono text-muted uppercase font-bold mb-1">
                          Tier / Severity
                        </label>
                        <div className="grid grid-cols-5 gap-1">
                          {([1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5)[]).map((t) => {
                            const tInfo = TIER_CONFIG[t];
                            const isSelected = editForm.tier === t;
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() =>
                                  setEditForm((prev) => ({ ...prev, tier: t }))
                                }
                                className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                                  isSelected
                                    ? `${tInfo.colorClass} ring-1 ring-white/20 scale-[1.02]`
                                    : "bg-surface border-border text-muted hover:text-main"
                                }`}
                              >
                                <div className="font-mono font-bold text-xs">L{t}</div>
                                <div className="text-[10px] truncate leading-tight mt-0.5 opacity-90">
                                  {tInfo.title.split(" ")[0]}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Date Input */}
                      <div>
                        <label className="block text-[11px] font-mono text-muted uppercase font-bold mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, date: e.target.value }))
                          }
                          className="w-full bg-surface border border-border rounded-lg px-2.5 py-1 text-xs text-main font-mono focus:outline-none focus:border-accent [color-scheme:dark]"
                        />
                      </div>

                      {/* Time Inputs */}
                      <div>
                        <label className="block text-[11px] font-mono text-muted uppercase font-bold mb-1">
                          Time (Start & End)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted font-mono">Start:</span>
                            <input
                              type="time"
                              required
                              value={editForm.startTime}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  startTime: e.target.value,
                                }))
                              }
                              className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-xs text-main font-mono focus:outline-none focus:border-accent text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted font-mono">End:</span>
                            <input
                              type="time"
                              required
                              value={editForm.endTime}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  endTime: e.target.value,
                                }))
                              }
                              className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-xs text-main font-mono focus:outline-none focus:border-accent text-center"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Defended Toggle */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                defended: !prev.defended,
                              }))
                            }
                            className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                              editForm.defended ? "bg-emerald-500" : "bg-zinc-700"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                                editForm.defended ? "translate-x-3.5" : "translate-x-0"
                              }`}
                            />
                          </button>
                          {editForm.defended ? (
                            <span className="text-xs font-semibold text-main flex items-center gap-1">
                              <span>Defended</span>
                              <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-muted">
                              Defended?
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-muted">
                          {editLivePoints} pts
                        </span>
                      </div>

                      {/* Save / Cancel Actions */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/60">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={isSaving}
                          className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-muted hover:text-main"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(inc.id)}
                          disabled={isSaving}
                          className="px-3.5 py-1 rounded-lg bg-accent text-zinc-950 font-bold text-xs flex items-center gap-1 hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={inc.id}
                    className="p-2.5 rounded-xl bg-surface-subtle border border-border flex flex-col gap-2 text-xs transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
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
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        {inc.defense_occurred && (
                          <div className="text-xs text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            <Shield className="w-3 h-3 text-emerald-400" />
                            <span>Defended</span>
                          </div>
                        )}
                        <span className="font-mono font-bold text-main text-sm">
                          {inc.points > 0 ? `+${inc.points}` : "0"}
                        </span>
                      </div>
                    </div>

                    {/* Subrow: Time & Late Night + Edit / Delete Controls */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-muted">
                      <div className="flex items-center gap-2 font-mono flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeOnly(inc.start_time)} – {formatTimeOnly(inc.end_time)}
                        </span>
                        {isLateNight(inc.start_time) && (
                          <span className="text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded flex items-center gap-1 text-[11px]">
                            <Moon className="w-3 h-3" />
                            <span>Late night</span>
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {confirmDeleteId === inc.id ? (
                          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-lg animate-in fade-in">
                            <span className="text-red-400 text-[11px] font-medium">
                              Delete?
                            </span>
                            <button
                              onClick={() => handleDelete(inc.id)}
                              disabled={isDeleting}
                              className="px-1.5 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded text-[11px] font-bold transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? "..." : "Yes"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="px-1.5 py-0.5 bg-surface border border-border text-muted hover:text-main rounded text-[11px] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(inc)}
                              title="Edit incident"
                              className="p-1 rounded-md text-muted hover:text-main hover:bg-surface border border-transparent hover:border-border transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(inc.id)}
                              title="Delete incident"
                              className="p-1 rounded-md text-muted hover:text-red-400 hover:bg-surface border border-transparent hover:border-border transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
