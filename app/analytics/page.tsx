"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { DashboardIncident, getDashboardData } from "@/app/actions/incidents";
import { HeatmapGrid } from "@/components/dashboard/HeatmapGrid";
import { DayInspectionDrawer } from "@/components/dashboard/DayInspectionDrawer";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  Clock,
  RefreshCw,
  MoreVertical,
  LogOut,
  X,
} from "lucide-react";

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [inceptionDate, setInceptionDate] = useState<string>(new Date().toISOString());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [inspectingDay, setInspectingDay] = useState<{
    dateStr: string;
    incidents: DashboardIncident[];
  } | null>(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const data = await getDashboardData();
      setIncidents(data.incidents);
      setInceptionDate(data.inceptionDate);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hourly Distribution ("Daily incident patterns" - "Measured by the hour")
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label:
        i === 0
          ? "12 AM"
          : i < 12
          ? `${i} AM`
          : i === 12
          ? "12 PM"
          : `${i - 12} PM`,
      count: 0,
      points: 0,
    }));

    for (const inc of incidents) {
      const d = new Date(inc.start_time);
      const h = d.getHours();
      if (hours[h]) {
        hours[h].count += 1;
        hours[h].points += inc.points;
      }
    }

    const maxCount = Math.max(1, ...hours.map((h) => h.count));

    let bestWindow = { startHour: 0, count: 0 };
    for (let i = 0; i < 24; i++) {
      const windowSum =
        hours[i].count +
        hours[(i + 1) % 24].count +
        hours[(i + 2) % 24].count;
      if (windowSum > bestWindow.count) {
        bestWindow = { startHour: i, count: windowSum };
      }
    }

    return { hours, maxCount, peakWindow: bestWindow };
  }, [incidents]);

  // Macro & Per-Color Weekly Averages (Option B: Median Points Baseline)
  const macroStats = useMemo(() => {
    const today = new Date();
    let start = new Date(inceptionDate);
    if (incidents.length > 0) {
      const dates = incidents.map((i) => new Date(i.logical_date).getTime());
      const minDate = new Date(Math.min(...dates));
      if (minDate < start) start = minDate;
    }

    const diffDays = Math.max(
      1,
      Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    const totalWeeks = Math.max(1, Math.ceil(diffDays / 7));
    const totalMonths = Math.max(
      1,
      (today.getFullYear() - start.getFullYear()) * 12 +
        (today.getMonth() - start.getMonth()) +
        1
    );

    const totalIncidents = incidents.length;
    const totalPoints = incidents.reduce((sum, i) => sum + i.points, 0);

    // Compute median weekly points
    const currentSunday = new Date(today);
    currentSunday.setDate(today.getDate() - today.getDay());
    currentSunday.setHours(0, 0, 0, 0);

    const startSunday = new Date(start);
    startSunday.setDate(start.getDate() - start.getDay());
    startSunday.setHours(0, 0, 0, 0);

    const weekPointsMap = new Map<string, number>();
    const iterW = new Date(startSunday);
    while (iterW <= currentSunday) {
      const key = `${iterW.getFullYear()}-${String(iterW.getMonth() + 1).padStart(2, "0")}-${String(iterW.getDate()).padStart(2, "0")}`;
      weekPointsMap.set(key, 0);
      iterW.setDate(iterW.getDate() + 7);
    }

    for (const inc of incidents) {
      const [y, m, d] = inc.logical_date.split("-").map(Number);
      const incDate = new Date(y, m - 1, d);
      incDate.setDate(incDate.getDate() - incDate.getDay());
      const key = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, "0")}-${String(incDate.getDate()).padStart(2, "0")}`;
      if (weekPointsMap.has(key)) {
        weekPointsMap.set(key, (weekPointsMap.get(key) || 0) + inc.points);
      }
    }

    const medianWeeklyPoints = computeMedian(Array.from(weekPointsMap.values()));

    // Per-tier / per-color breakdown
    const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const inc of incidents) {
      if (tierCounts[inc.tier_level] !== undefined) {
        tierCounts[inc.tier_level]++;
      }
    }

    const tierWeeklyAverages: Record<number, string> = {};
    for (let t = 1; t <= 5; t++) {
      tierWeeklyAverages[t] = (tierCounts[t] / totalWeeks).toFixed(1);
    }

    return {
      totalIncidents,
      totalPoints,
      avgWeeklyIncidents: (totalIncidents / totalWeeks).toFixed(1),
      avgWeeklyPoints: medianWeeklyPoints.toFixed(1),
      medianWeeklyPoints: medianWeeklyPoints.toFixed(1),
      tierCounts,
      tierWeeklyAverages,
      totalWeeks,
      totalDaysTracked: diffDays,
    };
  }, [incidents, inceptionDate]);

  return (
    <div className="min-h-screen bg-bg text-main">
      <div className="max-w-[760px] mx-auto px-3.5 sm:px-4 py-4 sm:py-6 flex flex-col gap-4">
        {/* Top Header - Kept identical to dashboard */}
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
            <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-border text-xs">
              <Link
                href="/"
                className="px-2 py-0.5 rounded-md font-semibold text-muted hover:text-main transition-colors"
              >
                Telemetry
              </Link>
              <span className="px-2 py-0.5 rounded-md font-bold bg-accent text-zinc-950">
                Analytics
              </span>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
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

            {/* Mobile Menu Button (Triple vertical dots) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="sm:hidden p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-main transition-colors"
              title="More Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 1. Historical Weekly Medians (Total & Per-Color) */}
        <section className="bg-surface rounded-xl border border-border p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-bold">
              Weekly Medians
            </h2>
            <span className="text-xs font-mono text-muted">
              {macroStats.totalWeeks} {macroStats.totalWeeks === 1 ? "week" : "weeks"} tracked
            </span>
          </div>

          {/* Overall summary numbers */}
          <div className="flex items-center gap-4 py-1">
            <div>
              <span className="text-xs text-muted block">Events / Week</span>
              <span className="text-2xl font-bold font-mono text-main">
                {macroStats.avgWeeklyIncidents}
              </span>
            </div>
            <div className="h-8 w-px bg-border/60" />
            <div>
              <span className="text-xs text-muted block">Points / Week (Median)</span>
              <span className="text-2xl font-bold font-mono text-main">
                {macroStats.avgWeeklyPoints}
              </span>
            </div>
          </div>

          {/* Per-color breakdown */}
          <div className="pt-2 border-t border-border/60">
            <span className="text-xs text-muted block mb-2 font-mono">
              Average by color / week:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5)[]).map((tier) => {
                const info = TIER_CONFIG[tier];
                const avg = macroStats.tierWeeklyAverages[tier];
                const count = macroStats.tierCounts[tier];

                return (
                  <div
                    key={tier}
                    className="p-2 rounded-lg bg-surface-subtle border border-border flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${info.colorClass}`}
                      >
                        L{tier}
                      </span>
                      <span className="text-xs text-muted font-mono">{count} total</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-base font-bold font-mono text-main">{avg}</span>
                      <span className="text-xs text-muted font-mono ml-1">/wk</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. 52-Week Yearly Heatmap (Placed ABOVE Daily incident patterns as requested) */}
        <section>
          <HeatmapGrid
            incidents={incidents}
            inceptionDate={inceptionDate}
            onSelectDate={(dateStr, dayIncidents) => {
              setInspectingDay({ dateStr, incidents: dayIncidents });
            }}
          />
        </section>

        {/* 3. Daily incident patterns ("Measured by the hour") */}
        <section className="bg-surface rounded-xl border border-border p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-main flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-accent" />
                <span>Daily incident patterns</span>
              </h2>
              <p className="text-xs text-muted">Measured by the hour</p>
            </div>

            {incidents.length > 0 && hourlyData.peakWindow.count > 0 && (
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
                Peak: {hourlyData.hours[hourlyData.peakWindow.startHour].label} –{" "}
                {
                  hourlyData.hours[
                    (hourlyData.peakWindow.startHour + 3) % 24
                  ].label
                }
              </div>
            )}
          </div>

          {incidents.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted">
              No incidents logged.
            </div>
          ) : (
            <div className="pt-2">
              <div className="h-28 flex items-end gap-1 sm:gap-1.5 w-full">
                {hourlyData.hours.map((h) => {
                  const pct = (h.count / hourlyData.maxCount) * 100;
                  const hasData = h.count > 0;
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative"
                    >
                      <div className="absolute -top-8 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                        <div className="bg-surface-elevated border border-border px-2 py-0.5 rounded text-xs font-mono text-main whitespace-nowrap shadow-lg">
                          {h.label}: {h.count} ({h.points} pts)
                        </div>
                      </div>

                      <div
                        style={{ height: hasData ? `${Math.max(10, pct)}%` : "3px" }}
                        className={`w-full rounded-t-sm transition-all duration-150 ${
                          hasData
                            ? "bg-accent/70 hover:bg-accent group-hover:scale-y-105"
                            : "bg-surface-subtle"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-xs font-mono text-muted mt-2 px-1">
                <span>12 AM</span>
                <span>4 AM</span>
                <span>8 AM</span>
                <span>12 PM</span>
                <span>4 PM</span>
                <span>8 PM</span>
                <span>11 PM</span>
              </div>
            </div>
          )}
        </section>

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
                  Analytics Actions
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-muted hover:text-main"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    loadData();
                  }}
                  className="w-full p-2.5 rounded-xl bg-surface-subtle border border-border text-main font-semibold text-xs flex items-center gap-2.5 justify-start"
                >
                  <RefreshCw className="w-4 h-4 text-accent" />
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

        {/* Day Inspection Drawer */}
        <DayInspectionDrawer
          dateStr={inspectingDay?.dateStr || null}
          incidents={inspectingDay?.incidents || []}
          onClose={() => setInspectingDay(null)}
        />
      </div>
    </div>
  );
}
