"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardIncident, getDashboardData } from "@/app/actions/incidents";
import { getVaultConfig, VaultStatus } from "@/app/actions/vault";
import { calculateStreaks } from "@/lib/telemetry/scoring";
import { getTodayDateString } from "@/lib/telemetry/time";
import { PeriodStats } from "@/components/dashboard/PeriodStats";
import { StreakCounters } from "@/components/dashboard/StreakCounters";
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
  Lock,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>({ initialized: false });
  const [inceptionDate, setInceptionDate] = useState<string>(new Date().toISOString());

  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isVaultSetupOpen, setIsVaultSetupOpen] = useState(false);

  const [inspectingDay, setInspectingDay] = useState<{
    dateStr: string;
    incidents: DashboardIncident[];
  } | null>(null);

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
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayStr = getTodayDateString();
  const streaks = calculateStreaks(incidents, todayStr, inceptionDate);

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
      <div className="max-w-[640px] md:max-w-[760px] mx-auto px-3.5 sm:px-4 py-4 sm:py-6 flex flex-col gap-4">
        {/* Top Header */}
        <header className="flex items-center justify-between gap-2 pb-3 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_#10b981]" />
            <h1 className="text-base font-bold tracking-tight text-main">PulseFlow</h1>

            {/* Navigation Switcher */}
            <div className="flex items-center ml-1 p-0.5 rounded-lg bg-surface-subtle border border-border text-xs">
              <span className="px-2.5 py-0.5 rounded-md font-bold bg-accent text-zinc-950">
                Telemetry
              </span>
              <Link
                href="/analytics"
                className="px-2.5 py-0.5 rounded-md font-semibold text-muted hover:text-main transition-colors"
              >
                Analytics
              </Link>
            </div>
          </div>

          {/* Action cluster */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setIsIntakeOpen(true)}
              disabled={!vaultStatus.initialized}
              className="px-3 py-1.5 rounded-lg bg-accent text-zinc-950 font-bold text-xs flex items-center gap-1 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Log</span>
            </button>

            <button
              onClick={() => setIsImportOpen(true)}
              disabled={!vaultStatus.initialized}
              title="Batch Import"
              className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-main hover:bg-surface-subtle transition-colors disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              disabled={!vaultStatus.initialized}
              title="Coaching Export"
              className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-main hover:bg-surface-subtle transition-colors disabled:opacity-50"
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => loadData()}
              title="Refresh"
              className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-main hover:bg-surface-subtle transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* First-boot banner if vault not initialized */}
        {!vaultStatus.initialized && !loading && (
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent shrink-0" />
              <span className="text-main">Cryptographic vault not initialized</span>
            </div>
            <button
              onClick={() => setIsVaultSetupOpen(true)}
              className="px-3 py-1 rounded-lg bg-accent text-zinc-950 font-bold text-xs shrink-0 hover:bg-accent-hover transition-colors"
            >
              Set Password
            </button>
          </div>
        )}

        {/* 1. Period Stats: Week / Month with deltas and swipe navigation */}
        <section>
          <PeriodStats incidents={incidents} inceptionDate={inceptionDate} />
        </section>

        {/* 2. Compact Streaks Bar */}
        <section>
          <StreakCounters streaks={streaks} />
        </section>

        {/* 3. History Ledger */}
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
          className="sm:hidden fixed bottom-5 right-5 w-12 h-12 rounded-full bg-accent text-zinc-950 shadow-2xl flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-transform z-40 disabled:opacity-50"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
        </button>

        {/* Modals & Sheets */}
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
