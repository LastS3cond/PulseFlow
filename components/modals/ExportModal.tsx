"use client";

import React, { useState } from "react";
import { getIncidentsForExport } from "@/app/actions/incidents";
import { decryptNarrativeWithPrivateKey } from "@/lib/crypto/asymmetric";
import { unwrapPrivateKeyWithPassword2 } from "@/lib/crypto/vault";
import {
  X,
  KeyRound,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  FileCode,
  ShieldCheck,
} from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  salt: string | null;
  encryptedPrivateKey: string | null;
}

const COACHING_PROMPT = `Analyze this protocol telemetry log. Focus on macro diurnal patterns, recurrence intervals,
and behavioral divergence trends over time rather than isolated specific incidents. Identify
temporal vulnerability windows, evaluate defense recovery efficacy, and suggest systemic
structural adjustments to sustain protocol discipline.

--- TELEMETRY LOG START ---`;

export function ExportModal({
  isOpen,
  onClose,
  salt,
  encryptedPrivateKey,
}: ExportModalProps) {
  const [password2, setPassword2] = useState<string>("");
  const [timeframe, setTimeframe] = useState<"all" | "90d" | "30d" | "7d">("all");
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedPayload, setGeneratedPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerateExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setGeneratedPayload(null);

    if (!password2) {
      setErrorMessage("Please enter Password 2 (Vault Password).");
      return;
    }

    if (!salt || !encryptedPrivateKey) {
      setErrorMessage("Vault keys are missing or not initialized.");
      return;
    }

    setIsDecrypting(true);
    try {
      // 1. Unwrap RSA Private Key in ephemeral memory using Password 2
      const privateKey = await unwrapPrivateKeyWithPassword2(
        password2,
        salt,
        encryptedPrivateKey
      );

      // 2. Compute date filter if requested
      let startDate: string | undefined;
      const now = new Date();
      if (timeframe === "7d") {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString().split("T")[0];
      } else if (timeframe === "30d") {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString().split("T")[0];
      } else if (timeframe === "90d") {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString().split("T")[0];
      }

      // 3. Fetch incidents from server
      const incidents = await getIncidentsForExport({ startDate });

      // 4. Decrypt narrative payloads in RAM and obfuscate into Base64
      const exportItems = await Promise.all(
        incidents.map(async (inc) => {
          let narrativeB64 = "";
          try {
            const decryptedJson = await decryptNarrativeWithPrivateKey(
              inc.encrypted_narrative,
              privateKey
            );
            // Obfuscate to Base64 for coaching prompt
            narrativeB64 = btoa(decryptedJson);
          } catch (decErr) {
            console.warn("Failed to decrypt narrative for record", inc.id, decErr);
            narrativeB64 = btoa(JSON.stringify({ error: "decryption_failed" }));
          }

          const startMs = new Date(inc.start_time).getTime();
          const endMs = new Date(inc.end_time).getTime();
          const duration_minutes = Math.max(0, Math.round((endMs - startMs) / 60000));

          return {
            start_time: inc.start_time,
            end_time: inc.end_time,
            duration_minutes,
            tier_level: inc.tier_level,
            points: inc.points,
            surge: inc.surge_occurred,
            defended: inc.defense_occurred,
            narrative_b64: narrativeB64,
          };
        })
      );

      // 5. Build coaching export payload
      const jsonOutput = JSON.stringify(exportItems, null, 2);
      const fullText = `${COACHING_PROMPT}\n${jsonOutput}\n--- TELEMETRY LOG END ---`;

      setGeneratedPayload(fullText);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message || "Invalid Password 2 or failed to decrypt telemetry records"
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedPayload) return;
    await navigator.clipboard.writeText(generatedPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedPayload) return;
    const blob = new Blob([generatedPayload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseflow-telemetry-coaching-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setPassword2("");
    setGeneratedPayload(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-surface-subtle border border-border text-accent">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-main">Coaching Export Gateway</h2>
              <p className="text-xs text-muted">
                Requires Password 2 to unwrap RSA private key &amp; generate obfuscated prompt
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!generatedPayload ? (
            <form onSubmit={handleGenerateExport} className="space-y-4">
              {/* Privacy Notice */}
              <div className="p-3.5 rounded-xl bg-surface-subtle border border-border text-xs text-muted space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-main">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>Dual-Password Ephemeral Decryption</span>
                </div>
                <p>
                  Password 2 derives the master AES key via PBKDF2 (100k iterations) exclusively in browser RAM. Your RSA private key is unwrapped temporarily and immediately erased once generation is complete.
                </p>
              </div>

              {/* Timeframe selection */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted font-bold mb-1.5">
                  Export Timeframe Window
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "90d", label: "Last 90 Days" },
                    { id: "30d", label: "Last 30 Days" },
                    { id: "7d", label: "Last 7 Days" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTimeframe(t.id as any)}
                      className={`py-2 px-1 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                        timeframe === t.id
                          ? "bg-accent/20 border-accent text-accent"
                          : "bg-surface-subtle border-border text-muted hover:border-border-light"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password 2 Input */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted font-bold mb-1.5">
                  Enter Password 2 (Vault Password)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter vault master password..."
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-xs text-main placeholder-muted/50 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isDecrypting || !password2}
                  className="px-5 py-2.5 rounded-xl bg-accent text-zinc-950 font-bold text-xs flex items-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {isDecrypting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deriving Key &amp; Decrypting...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Decrypt &amp; Build Coaching Payload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Decrypted &amp; Base64-obfuscated coaching payload generated successfully.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGeneratedPayload(null)}
                  className="text-[11px] underline font-mono text-emerald-300 hover:text-emerald-100"
                >
                  Reset / Re-run
                </button>
              </div>

              {/* Code viewer */}
              <div className="relative">
                <div className="flex items-center justify-between px-3 py-1.5 bg-surface-subtle border border-b-0 border-border rounded-t-xl text-xs font-mono text-muted">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-accent" />
                    <span>LLM Coaching Prompt Payload</span>
                  </span>
                  <span className="text-[11px] text-muted">Base64 Obfuscated</span>
                </div>
                <textarea
                  readOnly
                  rows={13}
                  value={generatedPayload}
                  className="w-full bg-[#06070a] border border-border rounded-b-xl p-3 text-xs font-mono text-slate-300 focus:outline-none resize-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-surface-subtle border border-border text-xs font-semibold text-muted hover:text-main"
                >
                  Close Gateway
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-surface-subtle border border-border text-xs font-semibold text-main hover:bg-border/60 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-5 py-2 rounded-lg bg-accent text-zinc-950 font-bold text-xs flex items-center gap-1.5 hover:bg-accent-hover transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-zinc-950" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Prompt &amp; Payload</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
