"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { DashboardIncident, getDashboardData } from "@/app/actions/incidents";
import { HeatmapGrid } from "@/components/dashboard/HeatmapGrid";
import { DayInspectionDrawer } from "@/components/dashboard/DayInspectionDrawer";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import {
  ArrowLeft,
  Clock,
  BarChart3,
  Calendar,
  Shield,
  Zap,
  TrendingDown,
  RefreshCw,
} from "lucide-react";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [inceptionDate, setInceptionDate] = useState<string>(new Date().toISOString());
  const [inspectingDay, setInspectingDay] = useState<{
    dateStr: string;
    incidents: DashboardIncident[];
  } | null>(null);

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

  // Hourly Vulnerability Distribution ("Average Time I Fail")
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

    // Find peak 3-hour vulnerability window
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

  // Macro Averages
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
    const defendedCount = incidents.filter((i) => i.defense_occurred).length;
    const defenseRate =
      totalIncidents > 0
        ? Math.round((defendedCount / totalIncidents) * 100)
        : 100;

    return {
      totalIncidents,
      totalPoints,
      defendedCount,
      defenseRate,
      avgWeeklyIncidents: (totalIncidents / totalWeeks).toFixed(1),
      avgWeeklyPoints: (totalPoints / totalWeeks).toFixed(1),
      avgMonthlyIncidents: (totalIncidents / totalMonths).toFixed(1),
      avgMonthlyPoints: (totalPoints / totalMonths).toFixed(1),
      totalDaysTracked: diffDays,
    };
  }, [incidents, inceptionDate]);

  return (
    <div className="min-h-screen bg-bg text-main">
      <div className="max-w-[960px] mx-auto px-4 py-5 sm:py-7 flex flex-col gap-6">
        {/* Top Header */}
        <header className="flex items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-main hover:bg-surface-subtle transition-colors"
              title="Return to Telemetry"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-main">Analytics</h1>
              <p className="text-xs text-muted">Averages, vulnerability patterns, and heatmaps</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-1 rounded-md text-xs font-semibold text-muted hover:text-main transition-colors"
            >
              Telemetry
            </Link>
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-accent text-zinc-950">
              Analytics
            </span>
            <button
              onClick={() => loadData()}
              title="Refresh Analytics"
              className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-main transition-colors ml-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* 1. Macro Averages Cards */}
        <section className="space-y-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-bold">
            Historical Averages
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-surface border border-border">
              <span className="text-[11px] font-mono text-muted uppercase">Avg Weekly</span>
              <div className="text-xl font-mono font-bold text-main mt-1">
                {macroStats.avgWeeklyIncidents}{" "}
                <span className="text-xs text-muted font-normal font-sans">events</span>
              </div>
              <span className="text-[11px] font-mono text-muted">{macroStats.avgWeeklyPoints} pts / wk</span>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border">
              <span className="text-[11px] font-mono text-muted uppercase">Avg Monthly</span>
              <div className="text-xl font-mono font-bold text-main mt-1">
                {macroStats.avgMonthlyIncidents}{" "}
                <span className="text-xs text-muted font-normal font-sans">events</span>
              </div>
              <span className="text-[11px] font-mono text-muted">{macroStats.avgMonthlyPoints} pts / mo</span>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border">
              <span className="text-[11px] font-mono text-muted uppercase">Defense Rate</span>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                {macroStats.defenseRate}%
              </div>
              <span className="text-[11px] font-mono text-muted">
                {macroStats.defendedCount} of {macroStats.totalIncidents} defended
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border">
              <span className="text-[11px] font-mono text-muted uppercase">Lifetime Points</span>
              <div className="text-xl font-mono font-bold text-main mt-1">
                {macroStats.totalPoints}
              </div>
              <span className="text-[11px] font-mono text-muted">{macroStats.totalDaysTracked} days tracked</span>
            </div>
          </div>
        </section>

        {/* 2. Diurnal Vulnerability ("Average Time I Fail") */}
        <section className="p-4 sm:p-5 rounded-xl bg-surface border border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-main flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <span>Diurnal Vulnerability Pattern</span>
              </h2>
              <p className="text-xs text-muted">
                Hourly frequency of divergence across 24-hour cycles.
              </p>
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

          {/* 24-Hour Bar Plot */}
          {incidents.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No divergence incidents logged. Pure focus baseline intact.
            </div>
          ) : (
            <div className="pt-2">
              <div className="h-32 flex items-end gap-1 sm:gap-1.5 w-full">
                {hourlyData.hours.map((h) => {
                  const pct = (h.count / hourlyData.maxCount) * 100;
                  const hasData = h.count > 0;
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-9 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                        <div className="bg-surface-elevated border border-border px-2 py-0.5 rounded text-[10px] font-mono text-main whitespace-nowrap shadow-lg">
                          {h.label}: {h.count} event{h.count === 1 ? "" : "s"} ({h.points} pts)
                        </div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: hasData ? `${Math.max(12, pct)}%` : "3px" }}
                        className={`w-full rounded-t-sm transition-all duration-200 ${
                          hasData
                            ? "bg-accent/70 hover:bg-accent group-hover:scale-y-105"
                            : "bg-surface-subtle"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between text-[10px] font-mono text-muted mt-2 px-1">
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

        {/* 3. 52-Week Heatmap */}
        <section>
          <HeatmapGrid
            incidents={incidents}
            onSelectDate={(dateStr, dayIncidents) => {
              setInspectingDay({ dateStr, incidents: dayIncidents });
            }}
          />
        </section>

        {/* Inspection Drawer */}
        <DayInspectionDrawer
          dateStr={inspectingDay?.dateStr || null}
          incidents={inspectingDay?.incidents || []}
          onClose={() => setInspectingDay(null)}
        />
      </div>
    </div>
  );
}
