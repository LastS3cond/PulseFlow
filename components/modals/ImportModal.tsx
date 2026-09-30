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
        text: "Vault key is not initialized.",
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
      const publicKey = await importPublicKeyFromSpki(publicKeySpki);
      const preparedPayloads = await parseAndEncryptImport(
        rawText,
        publicKey,
        format
      );

      if (preparedPayloads.length === 0) {
        throw new Error("No valid records found in import payload.");
      }

      const result = await bulkImportIncidents(preparedPayloads);

      if (!result.success) {
        throw new Error(result.error || "Import failed.");
      }

      setStatusMessage({
        type: "success",
        text: `Imported ${result.insertedCount} records successfully.`,
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to import records.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-main">Batch Import</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-main hover:bg-surface-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3.5">
          {statusMessage && (
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
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

          {/* Format selection */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  format === "csv"
                    ? "bg-accent text-zinc-950 font-bold"
                    : "bg-surface-subtle text-muted hover:text-main"
                }`}
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => setFormat("json")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  format === "json"
                    ? "bg-accent text-zinc-950 font-bold"
                    : "bg-surface-subtle text-muted hover:text-main"
                }`}
              >
                JSON
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySample}
                className="text-[11px] font-mono text-muted hover:text-main flex items-center gap-1 bg-surface-subtle border border-border px-2 py-1 rounded"
              >
                <Copy className="w-3 h-3" />
                <span>Sample</span>
              </button>
              <label className="text-[11px] font-mono text-accent hover:text-accent-hover cursor-pointer flex items-center gap-1 bg-accent/10 border border-accent/30 px-2 py-1 rounded">
                <FileText className="w-3 h-3" />
                <span>Upload</span>
                <input
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              format === "csv"
                ? "Paste CSV: logical_date,start_time,end_time,tier,defended,pathway,context,impact..."
                : 'Paste JSON array: [{"start_time": "...", "end_time": "...", "tier_level": 2, ...}]'
            }
            className="w-full bg-surface-subtle border border-border rounded-xl p-3 text-xs font-mono text-main placeholder-muted/50 focus:outline-none focus:border-accent resize-y"
          />
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs text-muted hover:text-main"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isProcessing || !rawText.trim()}
            className="px-4 py-1.5 rounded-lg bg-accent text-zinc-950 font-bold text-xs flex items-center gap-1.5 hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Import</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
