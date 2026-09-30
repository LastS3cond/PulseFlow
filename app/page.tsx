"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardIncident, getDashboardData } from "@/app/actions/incidents";
import { getVaultConfig, VaultStatus } from "@/app/actions/vault";
import { calculateStreaks } from "@/lib/telemetry/scoring";
import { getTodayDateString } from "@/lib/telemetry/time";
import { StreakCounters } from "@/components/dashboard/StreakCounters";
import { HeatmapGrid } from "@/components/dashboard/HeatmapGrid";
import { IncidentLedger } from "@/components/dashboard/IncidentLedger";
import { DayInspectionDrawer } from "@/components/dashboard/DayInspectionDrawer";
import { IntakeModal } from "@/components/modals/IntakeModal";
import { ImportModal } from "@/components/modals/ImportModal";
import { ExportModal } from "@/components/modals/ExportModal";
import { VaultSetupModal } from "@/components/modals/VaultSetupModal";
import {
  Plus,
  UploadCloud,
  FileCode,
  LogOut,
  RefreshCw,
  Shield,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  // Telemetry & Vault state
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>({ initialized: false });
  const [inceptionDate, setInceptionDate] = useState<string>(new Date().toISOString());

  // Modals state
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isVaultSetupOpen, setIsVaultSetupOpen] = useState(false);

  // Day inspection sheet
  const [inspectingDay, setInspectingDay] = useState<{
    dateStr: string;
    incidents: DashboardIncident[];
  } | null>(null);

  // Fetch all dashboard data
  const loadData = useCallback(async () => {
    try {
      const [dashData, vault] = await Promise.all([
        getDashboardData(),
        getVaultConfig(),
      ]);

      setIncidents(dashData.incidents);
      setInceptionDate(dashData.inceptionDate);
      setVaultStatus(vault);

      if (!vault.initialized) {
        setIsVaultSetupOpen(true);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute full-history streaks
  const todayStr = getTodayDateString();
  const streaks = calculateStreaks(incidents, todayStr, inceptionDate);

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-main">
      <div className="max-w-[1020px] mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
        {/* Top Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_12px_#10b981] shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-main">
                  PulseFlow
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-muted">
                  v2.0 PWA
                </span>
              </div>
              <p className="text-xs text-muted font-mono">
                Next.js 15 • Supabase PostgreSQL • Asymmetric Envelope Cryptography
              </p>
            </div>
          </div>

          {/* Action cluster */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsIntakeOpen(true)}
              disabled={!vaultStatus.initialized}
              className="px-3.5 py-1.5 rounded-lg bg-accent text-zinc-950 font-bold text-xs flex items-center gap-1.5 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Record Telemetry</span>
            </button>

            <button
              onClick={() => setIsImportOpen(true)}
              disabled={!vaultStatus.initialized}
              className="px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs font-semibold text-main hover:bg-border/60 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5 text-muted" />
              <span className="hidden sm:inline">Batch Ingest</span>
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              disabled={!vaultStatus.initialized}
              className="px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs font-semibold text-main hover:bg-border/60 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileCode className="w-3.5 h-3.5 text-muted" />
              <span className="hidden sm:inline">Coaching Export</span>
            </button>

            <button
              onClick={() => loadData()}
              title="Refresh Telemetry"
              className="p-1.5 rounded-lg bg-surface-subtle border border-border text-muted hover:text-main hover:bg-border/60 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              title="End Authenticated Session"
              className="p-1.5 rounded-lg bg-surface-subtle border border-border text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* First-boot banner if vault not initialized */}
        {!vaultStatus.initialized && !loading && (
          <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-accent shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-main">
                  Cryptographic Vault Not Initialized
                </h4>
                <p className="text-xs text-muted">
                  Initialize Password 2 to bootstrap your RSA-OAEP keypair and unlock zero-friction telemetry logging.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsVaultSetupOpen(true)}
              className="px-4 py-1.5 rounded-lg bg-accent text-zinc-950 font-bold text-xs shrink-0 hover:bg-accent-hover transition-colors"
            >
              Initialize Vault
            </button>
          </div>
        )}

        {/* 1. Full-History Independent Tier Streaks */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span>Full-History Protocol Discipline Streaks</span>
            </h2>
            <span className="text-[11px] text-muted font-mono">
              Trickle Reset Engine Active
            </span>
          </div>
          <StreakCounters streaks={streaks} />
        </section>

        {/* 2. 52-Week Operational Heatmap */}
        <section>
          <HeatmapGrid
            incidents={incidents}
            onSelectDate={(dateStr, dayIncidents) => {
              setInspectingDay({ dateStr, incidents: dayIncidents });
            }}
          />
        </section>

        {/* 3. Chronological Incident Ledger */}
        <section>
          <IncidentLedger
            incidents={incidents}
            onSelectDate={(dateStr, dayIncidents) => {
              setInspectingDay({ dateStr, incidents: dayIncidents });
            }}
            onRefresh={loadData}
          />
        </section>

        {/* Floating Action Button (FAB) on mobile */}
        <button
          onClick={() => setIsIntakeOpen(true)}
          disabled={!vaultStatus.initialized}
          className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-zinc-950 shadow-2xl flex items-center justify-center font-bold hover:scale-105 transition-transform z-40 disabled:opacity-50"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        {/* Modals & Inspection Drawer */}
        <IntakeModal
          isOpen={isIntakeOpen}
          onClose={() => setIsIntakeOpen(false)}
          onSuccess={loadData}
          publicKeySpki={vaultStatus.public_key_spki || null}
        />

        <ImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={loadData}
          publicKeySpki={vaultStatus.public_key_spki || null}
        />

        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          salt={vaultStatus.salt || null}
          encryptedPrivateKey={vaultStatus.encrypted_private_key || null}
        />

        <VaultSetupModal
          isOpen={isVaultSetupOpen}
          onSuccess={() => {
            setIsVaultSetupOpen(false);
            loadData();
          }}
        />

        <DayInspectionDrawer
          dateStr={inspectingDay?.dateStr || null}
          incidents={inspectingDay?.incidents || []}
          onClose={() => setInspectingDay(null)}
        />
      </div>
    </div>
  );
}
