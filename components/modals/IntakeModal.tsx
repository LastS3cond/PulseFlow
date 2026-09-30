"use client";

import React, { useState, useEffect } from "react";
import { insertIncident } from "@/app/actions/incidents";
import {
  importPublicKeyFromSpki,
  encryptNarrativeWithPublicKey,
} from "@/lib/crypto/asymmetric";
import {
  calculateIncidentPoints,
  deriveSurgeOccurred,
} from "@/lib/telemetry/scoring";
import {
  getTodayDateString,
  getYesterdayDateString,
  isLateNightWindow,
} from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import {
  X,
  Shield,
  Send,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface IntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  publicKeySpki: string | null;
}

export function IntakeModal({
  isOpen,
  onClose,
  onSuccess,
  publicKeySpki,
}: IntakeModalProps) {
  const [tierLevel, setTierLevel] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [logicalDateChoice, setLogicalDateChoice] = useState<"today" | "yesterday" | "custom">("today");
  const [customLogicalDate, setCustomLogicalDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [defended, setDefended] = useState<boolean>(false);

  const [pathway, setPathway] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [impact, setImpact] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const toTimeOnly = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setStartTime(toTimeOnly(fifteenMinsAgo));
    setEndTime(toTimeOnly(now));

    if (isLateNightWindow(now)) {
      setLogicalDateChoice("yesterday");
    } else {
      setLogicalDateChoice("today");
    }

    setCustomLogicalDate(getTodayDateString());
    setErrorMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  let resolvedLogicalDate = getTodayDateString();
  if (logicalDateChoice === "yesterday") {
    resolvedLogicalDate = getYesterdayDateString();
  } else if (logicalDateChoice === "custom") {
    resolvedLogicalDate = customLogicalDate || getTodayDateString();
  }

  const livePoints = calculateIncidentPoints(tierLevel, defended);
  const liveSurge = deriveSurgeOccurred(defended);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!publicKeySpki) {
      setErrorMessage("Vault key is not initialized.");
      return;
    }

    if (!startTime || !endTime) {
      setErrorMessage("Start and end times are required.");
      return;
    }

    // Combine resolved date with time
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const [yr, mo, da] = resolvedLogicalDate.split("-").map(Number);

    const startObj = new Date(yr, mo - 1, da, sh, sm);
    let endObj = new Date(yr, mo - 1, da, eh, em);

    // If end time is earlier than start time, it crossed midnight into next day
    if (endObj.getTime() < startObj.getTime()) {
      endObj = new Date(endObj.getTime() + 86400000);
    }

    setIsSubmitting(true);
    try {
      const publicKey = await importPublicKeyFromSpki(publicKeySpki);
      const narrativeJson = JSON.stringify({
        pathway: pathway.trim(),
        context: context.trim(),
        impact: impact.trim(),
      });

      const encryptedNarrative = await encryptNarrativeWithPublicKey(
        narrativeJson,
        publicKey
      );

      const result = await insertIncident({
        logical_date: resolvedLogicalDate,
        start_time: startObj.toISOString(),
        end_time: endObj.toISOString(),
        tier_level: tierLevel,
        defense_occurred: defended,
        surge_occurred: liveSurge,
        points: livePoints,
        encrypted_narrative: encryptedNarrative,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to record entry");
      }

      setPathway("");
      setContext("");
      setImpact("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-main">Log Incident</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-main hover:bg-surface-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 overflow-y-auto space-y-3">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tier Selector */}
          <div>
            <label className="block text-xs font-mono text-muted uppercase font-bold mb-1">
              Tier
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {([1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5)[]).map((t) => {
                const info = TIER_CONFIG[t];
                const isSelected = tierLevel === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTierLevel(t)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all ${
                      isSelected
                        ? `${info.colorClass} ring-1 ring-white/20 scale-[1.02]`
                        : "bg-surface-subtle border-border hover:border-border-light text-muted"
                    }`}
                  >
                    <div className="font-mono font-bold text-xs">L{t}</div>
                    <div className="text-xs truncate leading-tight mt-0.5 opacity-90">
                      {info.title.split(" ")[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-mono text-muted uppercase font-bold mb-1">
              Date
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLogicalDateChoice("today")}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  logicalDateChoice === "today"
                    ? "bg-accent text-zinc-950 font-bold border-accent"
                    : "bg-surface-subtle border-border text-muted hover:text-main"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setLogicalDateChoice("yesterday")}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  logicalDateChoice === "yesterday"
                    ? "bg-accent text-zinc-950 font-bold border-accent"
                    : "bg-surface-subtle border-border text-muted hover:text-main"
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setLogicalDateChoice("custom")}
                className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  logicalDateChoice === "custom"
                    ? "bg-accent text-zinc-950 font-bold border-accent"
                    : "bg-surface-subtle border-border text-muted hover:text-main"
                }`}
              >
                Custom
              </button>
            </div>

            {logicalDateChoice === "custom" && (
              <input
                type="date"
                value={customLogicalDate}
                onChange={(e) => setCustomLogicalDate(e.target.value)}
                className="mt-2 w-full max-w-full box-border bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-xs text-main font-mono focus:outline-none focus:border-accent"
              />
            )}
          </div>

          {/* Time Only (Start & End) - Narrow inline inputs to prevent scrolling */}
          <div>
            <label className="block text-xs font-mono text-muted uppercase font-bold mb-1">
              Time
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted font-mono">Start:</span>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-24 sm:w-28 bg-surface-subtle border border-border rounded-lg px-2 py-1 text-xs text-main font-mono focus:outline-none focus:border-accent text-center"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted font-mono">End:</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-24 sm:w-28 bg-surface-subtle border border-border rounded-lg px-2 py-1 text-xs text-main font-mono focus:outline-none focus:border-accent text-center"
                />
              </div>
            </div>
          </div>

          {/* Defended Toggle: Defended? if off, Defended (shield icon) if on */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-subtle border border-border">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDefended(!defended)}
                className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                  defended ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    defended ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </button>
              {defended ? (
                <span className="text-xs font-semibold text-main flex items-center gap-1">
                  <span>Defended</span>
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                </span>
              ) : (
                <span className="text-xs font-semibold text-muted">Defended?</span>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-main">
                {livePoints > 0 ? `+${livePoints} pts` : "0 pts"}
              </span>
            </div>
          </div>

          {/* Reflections */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-muted uppercase font-bold">
              Reflections
            </label>

            <input
              type="text"
              placeholder="Pathway (e.g. video loop, tech feed)"
              value={pathway}
              onChange={(e) => setPathway(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded-lg px-3 py-1.5 text-xs text-main placeholder-muted/50 focus:outline-none focus:border-accent"
            />

            <textarea
              rows={3}
              placeholder="Context (e.g. fatigue, afternoon lull, emotional state...)"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full h-[68px] bg-surface-subtle border border-border rounded-lg px-3 py-1.5 text-xs text-main placeholder-muted/50 focus:outline-none focus:border-accent resize-none"
            />

            <textarea
              rows={3}
              placeholder="Impact (e.g. 20m delay, missed workout, disrupted flow...)"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              className="w-full h-[68px] bg-surface-subtle border border-border rounded-lg px-3 py-1.5 text-xs text-main placeholder-muted/50 focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs text-muted hover:text-main"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-accent text-zinc-950 font-bold text-xs flex items-center gap-1.5 hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
