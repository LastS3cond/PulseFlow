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
  getLogicalDateForTimestamp,
  getTodayDateString,
  getYesterdayDateString,
  isLateNightWindow,
} from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import {
  X,
  Shield,
  Zap,
  Lock,
  Calendar,
  Clock,
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
  // Form state
  const [tierLevel, setTierLevel] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [logicalDateChoice, setLogicalDateChoice] = useState<"today" | "yesterday" | "custom">("today");
  const [customLogicalDate, setCustomLogicalDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [defended, setDefended] = useState<boolean>(false);

  // Qualitative narrative fields
  const [pathway, setPathway] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [impact, setImpact] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize dates and awake-cycle attribution when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    // Default times: 15 minutes duration ending now
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const toLocalDatetime = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`;
    };

    setStartTime(toLocalDatetime(fifteenMinsAgo));
    setEndTime(toLocalDatetime(now));

    // Awake-cycle attribution: If 12:00 AM - 5:59:59 AM, pre-select Yesterday
    if (isLateNightWindow(now)) {
      setLogicalDateChoice("yesterday");
    } else {
      setLogicalDateChoice("today");
    }

    setCustomLogicalDate(getTodayDateString());
    setErrorMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute effective logical_date
  let resolvedLogicalDate = getTodayDateString();
  if (logicalDateChoice === "yesterday") {
    resolvedLogicalDate = getYesterdayDateString();
  } else if (logicalDateChoice === "custom") {
    resolvedLogicalDate = customLogicalDate || getTodayDateString();
  }

  // Live points computation
  const livePoints = calculateIncidentPoints(tierLevel, defended);
  const liveSurge = deriveSurgeOccurred(defended);

  // Shortcut duration setter
  const applyDuration = (minutes: number) => {
    const end = endTime ? new Date(endTime) : new Date();
    const start = new Date(end.getTime() - minutes * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setStartTime(
      `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(
        start.getHours()
      )}:${pad(start.getMinutes())}`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!publicKeySpki) {
      setErrorMessage(
        "Vault encryption key is not initialized. Please initialize your vault first."
      );
      return;
    }

    if (!startTime || !endTime) {
      setErrorMessage("Start and end timestamps are required.");
      return;
    }

    const startObj = new Date(startTime);
    const endObj = new Date(endTime);

    if (endObj.getTime() < startObj.getTime()) {
      setErrorMessage("End time cannot be earlier than start time.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Asymmetric Envelope Encryption client-side
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

      // 2. Dispatch to Server Action
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
        throw new Error(result.error || "Failed to record telemetry incident");
      }

      // Reset and close
      setPathway("");
      setContext("");
      setImpact("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "An unexpected error occurred during encryption/ingest");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold">
              PF
            </div>
            <div>
              <h2 className="text-base font-bold text-main">Record Telemetry Window</h2>
              <p className="text-xs text-muted">Zero-friction asymmetric write-only logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Operational Tier Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted font-bold mb-2">
              Operational Divergence Tier
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
                        ? `${info.colorClass} ring-2 ring-accent scale-[1.02]`
                        : "bg-surface-subtle border-border hover:border-border-light text-muted"
                    }`}
                  >
                    <div className="font-mono font-bold text-xs">L{t}</div>
                    <div className="text-[10px] truncate leading-tight mt-0.5 opacity-90">
                      {info.title.split(" ")[0]}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted mt-1.5 font-mono">
              {TIER_CONFIG[tierLevel].badge}: {TIER_CONFIG[tierLevel].definition}
            </p>
          </div>

          {/* 2. Temporal Awake-Cycle Attribution */}
          <div className="pt-2 border-t border-border/60">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted font-bold mb-1.5">
              Awake-Cycle Logical Date
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLogicalDateChoice("today")}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                  logicalDateChoice === "today"
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-surface-subtle border-border text-muted hover:border-border-light"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setLogicalDateChoice("yesterday")}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                  logicalDateChoice === "yesterday"
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-surface-subtle border-border text-muted hover:border-border-light"
                }`}
              >
                Yesterday (Late Night)
              </button>
              <button
                type="button"
                onClick={() => setLogicalDateChoice("custom")}
                className={`py-1.5 px-3 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                  logicalDateChoice === "custom"
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-surface-subtle border-border text-muted hover:border-border-light"
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
                className="mt-2 w-full bg-surface-subtle border border-border rounded-lg px-3 py-1.5 text-xs text-main font-mono focus:outline-none focus:border-accent"
              />
            )}
            <p className="text-[10.5px] text-muted mt-1">
              Assigned to: <span className="font-mono text-main">{resolvedLogicalDate}</span>{" "}
              (governs streak calculations &amp; heatmaps)
            </p>
          </div>

          {/* 3. Timestamps & Duration Shortcuts */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted font-bold">
                Telemetry Window (UTC/Local)
              </label>
              <div className="flex items-center gap-1">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => applyDuration(mins)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-border text-muted hover:text-main hover:border-border-light"
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted font-mono block mb-1">Start Time</span>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-xs text-main font-mono focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted font-mono block mb-1">End Time</span>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-xs text-main font-mono focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* 4. Defense Modifier Toggle */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDefended(!defended)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    defended ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      defended ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <div>
                  <div className="text-xs font-semibold text-main flex items-center gap-1.5">
                    <span>Protocol Defense Deployed</span>
                    {defended && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div className="text-[11px] text-muted">
                    {defended
                      ? `Active interception applied (-${tierLevel === 1 ? 1 : 2} pts deduction)`
                      : "Uncontested divergence (Surge recorded)"}
                  </div>
                </div>
              </div>

              {/* Point Preview */}
              <div className="text-right">
                <div className="text-sm font-mono font-bold text-main">
                  {livePoints > 0 ? `+${livePoints} pts` : "0 pts"}
                </div>
                <div className="text-[10px] font-mono text-muted uppercase">Net Impact</div>
              </div>
            </div>
          </div>

          {/* 5. Qualitative Reflections (Envelope Encrypted) */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-muted font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span>Asymmetric Qualitative Fields (Write-Only)</span>
              </label>
              <span className="text-[10px] text-accent font-mono">RSA-OAEP 2048</span>
            </div>

            <div>
              <input
                type="text"
                placeholder="Pathway (e.g. tech forum -> reader links, video loop)"
                value={pathway}
                onChange={(e) => setPathway(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-lg px-3 py-1.5 text-xs text-main placeholder-muted/60 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Context (e.g. fatigue, afternoon lull)"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-lg px-3 py-1.5 text-xs text-main placeholder-muted/60 focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="Impact (e.g. delayed sprint by 20m)"
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-lg px-3 py-1.5 text-xs text-main placeholder-muted/60 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-subtle border border-border text-xs font-semibold text-muted hover:text-main transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-accent text-zinc-950 font-bold text-xs flex items-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Encrypting &amp; Ingesting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Log Telemetry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
