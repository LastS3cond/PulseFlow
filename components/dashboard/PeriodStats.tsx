"use client";

import React, { useState, useMemo } from "react";
import { DashboardIncident } from "@/app/actions/incidents";
import { formatLocalDate } from "@/lib/telemetry/time";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface PeriodStatsProps {
  incidents: DashboardIncident[];
  inceptionDate?: string;
}

export function PeriodStats({ incidents, inceptionDate }: PeriodStatsProps) {
  const [tab, setTab] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [monthOffset, setMonthOffset] = useState<number>(0);

  // Swipe detection
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const today = useMemo(() => new Date(), []);

  // Compute total history spans for averages
  const { totalWeeks, totalMonths } = useMemo(() => {
    let start = inceptionDate ? new Date(inceptionDate) : today;
    if (incidents.length > 0) {
      const dates = incidents.map((i) => new Date(i.logical_date).getTime());
      const minDate = new Date(Math.min(...dates));
      if (minDate < start) start = minDate;
    }
    const diffMs = Math.max(0, today.getTime() - start.getTime());
    const weeks = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
    const months = Math.max(
      1,
      (today.getFullYear() - start.getFullYear()) * 12 +
        (today.getMonth() - start.getMonth()) +
        1
    );
    return { totalWeeks: weeks, totalMonths: months };
  }, [incidents, inceptionDate, today]);

  // Total historical counts
  const totalHistoricalIncidents = incidents.length;
  const totalHistoricalPoints = incidents.reduce((sum, i) => sum + i.points, 0);

  const avgWeeklyIncidents = totalHistoricalIncidents / totalWeeks;
  const avgWeeklyPoints = totalHistoricalPoints / totalWeeks;

  const avgMonthlyIncidents = totalHistoricalIncidents / totalMonths;
  const avgMonthlyPoints = totalHistoricalPoints / totalMonths;

  // Selected Week Calculation
  const weekData = useMemo(() => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay(); // 0 is Sunday
    // Sunday of current week
    const currentSunday = new Date(d);
    currentSunday.setDate(d.getDate() - dayOfWeek);

    // Target Sunday with offset
    const targetSunday = new Date(currentSunday);
    targetSunday.setDate(currentSunday.getDate() + weekOffset * 7);

    // Target Saturday
    const targetSaturday = new Date(targetSunday);
    targetSaturday.setDate(targetSunday.getDate() + 6);

    const startStr = formatLocalDate(targetSunday);
    const endStr = formatLocalDate(targetSaturday);

    const matching = incidents.filter(
      (i) => i.logical_date >= startStr && i.logical_date <= endStr
    );

    const count = matching.length;
    const points = matching.reduce((sum, i) => sum + i.points, 0);

    const startLabel = targetSunday.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    const endLabel = targetSaturday.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });

    let title = `${startLabel} – ${endLabel}`;
    if (weekOffset === 0) title = `This Week (${startLabel} – ${endLabel})`;
    else if (weekOffset === -1) title = `Last Week (${startLabel} – ${endLabel})`;

    return { count, points, title };
  }, [today, weekOffset, incidents]);

  // Selected Month Calculation
  const monthData = useMemo(() => {
    const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = target.getFullYear();
    const month = target.getMonth();

    const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(
      2,
      "0"
    )}`;

    const matching = incidents.filter(
      (i) => i.logical_date >= startStr && i.logical_date <= endStr
    );

    const count = matching.length;
    const points = matching.reduce((sum, i) => sum + i.points, 0);

    const monthName = target.toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });

    let title = monthName;
    if (monthOffset === 0) title = `This Month (${monthName})`;
    else if (monthOffset === -1) title = `Last Month (${monthName})`;

    return { count, points, title };
  }, [today, monthOffset, incidents]);

  // Current view stats & deltas
  const isWeek = tab === "week";
  const currentCount = isWeek ? weekData.count : monthData.count;
  const currentPoints = isWeek ? weekData.points : monthData.points;
  const currentTitle = isWeek ? weekData.title : monthData.title;

  const avgCount = isWeek ? avgWeeklyIncidents : avgMonthlyIncidents;
  const avgPoints = isWeek ? avgWeeklyPoints : avgMonthlyPoints;

  const deltaCount = currentCount - avgCount;
  const deltaPoints = currentPoints - avgPoints;

  const currentOffset = isWeek ? weekOffset : monthOffset;
  const canGoForward = currentOffset < 0;

  const handlePrev = () => {
    if (isWeek) setWeekOffset((prev) => prev - 1);
    else setMonthOffset((prev) => prev - 1);
  };

  const handleNext = () => {
    if (!canGoForward) return;
    if (isWeek) setWeekOffset((prev) => prev + 1);
    else setMonthOffset((prev) => prev + 1);
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 45) {
      // Swipe right -> Go previous
      handlePrev();
    } else if (deltaX < -45 && canGoForward) {
      // Swipe left -> Go next
      handleNext();
    }
    setTouchStartX(null);
  };

  const renderDelta = (delta: number, suffix: string = "") => {
    const formatted = Math.abs(delta).toFixed(1);
    if (Math.abs(delta) < 0.1) {
      return (
        <span className="text-muted flex items-center gap-0.5 text-[11px] font-mono">
          <Minus className="w-3 h-3" />
          <span>avg</span>
        </span>
      );
    }
    if (delta < 0) {
      // Fewer incidents / points is better (emerald)
      return (
        <span className="text-emerald-400 flex items-center gap-0.5 text-[11px] font-mono">
          <TrendingDown className="w-3 h-3" />
          <span>
            -{formatted}
            {suffix} vs avg
          </span>
        </span>
      );
    }
    // More incidents / points is worse (amber)
    return (
      <span className="text-amber-400 flex items-center gap-0.5 text-[11px] font-mono">
        <TrendingUp className="w-3 h-3" />
        <span>
          +{formatted}
          {suffix} vs avg
        </span>
      </span>
    );
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="bg-surface rounded-xl border border-border p-3.5 sm:p-4 transition-all select-none"
    >
      {/* Top Header: Tab Switcher & Navigation */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/70">
        {/* Week / Month Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-border">
          <button
            type="button"
            onClick={() => setTab("week")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              tab === "week"
                ? "bg-accent text-zinc-950 font-bold shadow-sm"
                : "text-muted hover:text-main"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setTab("month")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              tab === "month"
                ? "bg-accent text-zinc-950 font-bold shadow-sm"
                : "text-muted hover:text-main"
            }`}
          >
            Month
          </button>
        </div>

        {/* Navigation & Period Title */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-main truncate max-w-[170px] sm:max-w-none text-right">
            {currentTitle}
          </span>
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={handlePrev}
              title="Previous period"
              className="p-1 rounded-md text-muted hover:text-main hover:bg-surface-subtle transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={!canGoForward}
              title="Next period"
              className="p-1 rounded-md text-muted hover:text-main hover:bg-surface-subtle transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Metric Cards */}
      <div className="grid grid-cols-2 gap-3 pt-3">
        {/* Incidents */}
        <div className="bg-surface-subtle rounded-lg p-2.5 sm:p-3 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
            Incidents
          </span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-main">
              {currentCount}
            </span>
          </div>
          <div className="mt-0.5">{renderDelta(deltaCount)}</div>
        </div>

        {/* Points */}
        <div className="bg-surface-subtle rounded-lg p-2.5 sm:p-3 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
            Points
          </span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-main">
              {currentPoints}
            </span>
          </div>
          <div className="mt-0.5">{renderDelta(deltaPoints, " pts")}</div>
        </div>
      </div>
    </div>
  );
}
