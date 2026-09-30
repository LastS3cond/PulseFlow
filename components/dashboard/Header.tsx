"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  UploadCloud,
  FileCode,
  LogOut,
  RefreshCw,
  MoreVertical,
  X,
} from "lucide-react";

interface HeaderProps {
  currentTab: "telemetry" | "analytics";
  onRefresh: () => void;
  onOpenLog?: () => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
  isVaultInitialized?: boolean;
}

export function Header({
  currentTab,
  onRefresh,
  onOpenLog,
  onOpenImport,
  onOpenExport,
  isVaultInitialized = true,
}: HeaderProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <>
      <header className="flex items-center justify-between gap-2 pb-3 border-b border-border/70">
        {/* Brand & Trajectory Icon */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-surface border border-border p-0.5 flex items-center justify-center shrink-0">
            <Image
              src="/icon.svg"
              alt="Trajectory"
              width={20}
              height={20}
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-base font-bold tracking-tight text-main">Trajectory</h1>
        </div>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* View Switcher Pill */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-border text-xs">
            {currentTab === "telemetry" ? (
              <>
                <span className="px-2 py-0.5 rounded-md font-bold bg-accent text-zinc-950">
                  Telemetry
                </span>
                <Link
                  href="/analytics"
                  className="px-2 py-0.5 rounded-md font-semibold text-muted hover:text-main transition-colors"
                >
                  Analytics
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className="px-2 py-0.5 rounded-md font-semibold text-muted hover:text-main transition-colors"
                >
                  Telemetry
                </Link>
                <span className="px-2 py-0.5 rounded-md font-bold bg-accent text-zinc-950">
                  Analytics
                </span>
              </>
            )}
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            {onOpenLog && (
              <button
                onClick={onOpenLog}
                disabled={!isVaultInitialized}
                className="px-3 py-1.5 rounded-lg bg-accent text-zinc-950 font-bold text-xs flex items-center gap-1 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Log</span>
              </button>
            )}

            {onOpenImport && (
              <button
                onClick={onOpenImport}
                disabled={!isVaultInitialized}
                title="Batch Import"
                className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-main hover:bg-surface-subtle transition-colors disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
              </button>
            )}

            {onOpenExport && (
              <button
                onClick={onOpenExport}
                disabled={!isVaultInitialized}
                title="Coaching Export"
                className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-main hover:bg-surface-subtle transition-colors disabled:opacity-50"
              >
                <FileCode className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onRefresh}
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

          {/* Mobile Menu Button (Triple vertical dots) */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="sm:hidden p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-main transition-colors"
            title="Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-Up Action Drawer */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:hidden p-3 pb-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-full bg-surface border border-border rounded-2xl p-4 shadow-2xl space-y-2 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="text-xs font-mono uppercase font-bold text-muted">
                Trajectory Actions
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg text-muted hover:text-main"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {onOpenLog && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenLog();
                  }}
                  disabled={!isVaultInitialized}
                  className="w-full p-2.5 rounded-xl bg-accent text-zinc-950 font-bold text-xs flex items-center gap-2.5 justify-start disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Log Incident</span>
                </button>
              )}

              {onOpenImport && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenImport();
                  }}
                  disabled={!isVaultInitialized}
                  className="w-full p-2.5 rounded-xl bg-surface-subtle border border-border text-main font-semibold text-xs flex items-center gap-2.5 justify-start disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4 text-accent" />
                  <span>Batch Import (CSV / JSON)</span>
                </button>
              )}

              {onOpenExport && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenExport();
                  }}
                  disabled={!isVaultInitialized}
                  className="w-full p-2.5 rounded-xl bg-surface-subtle border border-border text-main font-semibold text-xs flex items-center gap-2.5 justify-start disabled:opacity-50"
                >
                  <FileCode className="w-4 h-4 text-accent" />
                  <span>Coaching Export</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onRefresh();
                }}
                className="w-full p-2.5 rounded-xl bg-surface-subtle border border-border text-main font-semibold text-xs flex items-center gap-2.5 justify-start"
              >
                <RefreshCw className="w-4 h-4 text-muted" />
                <span>Refresh Data</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-xs flex items-center gap-2.5 justify-start"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
