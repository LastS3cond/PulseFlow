"use client";

import React, { useState } from "react";
import { bulkImportIncidents } from "@/app/actions/incidents";
import { importPublicKeyFromSpki } from "@/lib/crypto/asymmetric";
import { parseAndEncryptImport } from "@/lib/telemetry/importer";
import {
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  Info,
} from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  publicKeySpki: string | null;
}

const SAMPLE_CSV = `logical_date,start_time,end_time,tier,defended,pathway,context,impact
2025-11-13,2025-11-14 03:15,2025-11-14 03:45,2,true,"tech forum","fatigue","30m delay"
,2025-11-15 14:00,2025-11-15 14:20,1,false,"social feed","procrastination","lost 20m"
2025-11-16,2025-11-16 22:30,2025-11-16 23:15,3,false,"video loop","boredom","missed gym"`;

const SAMPLE_JSON = `[
  {
    "logical_date": "2025-11-13",
    "start_time": "2025-11-14T03:15:00Z",
    "end_time": "2025-11-14T03:45:00Z",
    "tier_level": 2,
    "defense_occurred": true,
    "pathway": "tech forum",
    "context": "fatigue",
    "impact": "30m delay"
  }
]`;

export function ImportModal({
  isOpen,
  onClose,
  onSuccess,
  publicKeySpki,
}: ImportModalProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [rawText, setRawText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleCopySample = () => {
    const sample = format === "csv" ? SAMPLE_CSV : SAMPLE_JSON;
    setRawText(sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      if (file.name.endsWith(".json")) {
        setFormat("json");
      } else if (file.name.endsWith(".csv")) {
        setFormat("csv");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStatusMessage(null);

    if (!publicKeySpki) {
      setStatusMessage({
        type: "error",
        text: "Vault encryption key is not initialized. Please configure your vault first.",
      });
      return;
    }

    if (!rawText.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please provide CSV or JSON data to import.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Import Public Key
      const publicKey = await importPublicKeyFromSpki(publicKeySpki);

      // 2. Parse and batch encrypt client-side
      const preparedPayloads = await parseAndEncryptImport(
        rawText,
        publicKey,
        format
      );

      if (preparedPayloads.length === 0) {
        throw new Error("No valid records found in import payload.");
      }

      // 3. Dispatch to Server Action
      const result = await bulkImportIncidents(preparedPayloads);

      if (!result.success) {
        throw new Error(result.error || "Server bulk import failed.");
      }

      setStatusMessage({
        type: "success",
        text: `Successfully ingested ${result.insertedCount} telemetry incident${
          result.insertedCount === 1 ? "" : "s"
        }. Full-history streaks and heatmaps updated.`,
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to parse and import records.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-surface-subtle border border-border text-accent">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-main">
                Batch Historical Ingestion Engine
              </h2>
              <p className="text-xs text-muted">
                Import Apple Notes CSV/JSON with client-side RSA envelope encryption
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Format selection and File upload */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted font-bold">Format:</span>
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                  format === "csv"
                    ? "bg-accent/20 border border-accent text-accent"
                    : "bg-surface-subtle border border-border text-muted"
                }`}
              >
                CSV (Apple Notes)
              </button>
              <button
                type="button"
                onClick={() => setFormat("json")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                  format === "json"
                    ? "bg-accent/20 border border-accent text-accent"
                    : "bg-surface-subtle border border-border text-muted"
                }`}
              >
                JSON Array
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySample}
                className="text-[11px] font-mono text-muted hover:text-main flex items-center gap-1 bg-surface-subtle border border-border px-2 py-1 rounded"
              >
                <Copy className="w-3 h-3" />
                <span>Insert Sample</span>
              </button>
              <label className="text-[11px] font-mono text-accent hover:text-accent-hover cursor-pointer flex items-center gap-1 bg-accent/10 border border-accent/30 px-2 py-1 rounded">
                <FileText className="w-3 h-3" />
                <span>Upload File</span>
                <input
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Raw Text Input */}
          <div>
            <textarea
              rows={9}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                format === "csv"
                  ? "Paste CSV with headers (logical_date,start_time,end_time,tier,defended,pathway,context,impact)..."
                  : 'Paste JSON array: [{"start_time": "...", "end_time": "...", "tier_level": 2, ...}]'
              }
              className="w-full bg-surface-subtle border border-border rounded-xl p-3 text-xs font-mono text-main placeholder-muted/50 focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* Architecture notes */}
          <div className="p-3 rounded-xl bg-surface-subtle/80 border border-border text-[11px] text-muted space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-main">
              <Info className="w-3.5 h-3.5 text-accent" />
              <span>Idempotent Telemetry Ingestion</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>
                <strong>Idempotent Ingestion:</strong> Existing windows matching{" "}
                <code>(start_time, end_time, tier_level)</code> are safely skipped.
              </li>
              <li>
                <strong>Late-Night Awake Cycle:</strong> If <code>logical_date</code> is left blank,
                the engine derives it using the 12:00 AM – 5:59 AM rule.
              </li>
              <li>
                <strong>Asymmetric Privacy:</strong> Every single imported record generates an
                ephemeral AES-GCM DEK wrapped with the RSA-OAEP public key.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface-subtle/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface border border-border text-xs font-semibold text-muted hover:text-main transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isProcessing || !rawText.trim()}
            className="px-5 py-2 rounded-lg bg-accent text-zinc-950 font-bold text-xs flex items-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Encrypting &amp; Upserting...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Execute Batch Ingest</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
