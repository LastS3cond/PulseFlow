"use client";

import React, { useState, useMemo } from "react";
import { DashboardIncident } from "@/app/actions/incidents";
import { formatLocalDate } from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PeriodStatsProps {
  incidents: DashboardIncident[];
  inceptionDate?: string;
  onSelectDate?: (dateStr: string, incidentsForDate: DashboardIncident[]) => void;
}

export function PeriodStats({
  incidents,
  inceptionDate,
  onSelectDate,
}: PeriodStatsProps) {
  const [tab, setTab] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatLocalDate(today), [today]);

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

  // Historical overall and per-color averages
  const {
    avgWeeklyIncidents,
    avgWeeklyPoints,
    avgMonthlyIncidents,
    avgMonthlyPoints,
    tierWeeklyAverages,
    tierMonthlyAverages,
  } = useMemo(() => {
    const totalCount = incidents.length;
    const totalPts = incidents.reduce((sum, i) => sum + i.points, 0);

    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const inc of incidents) {
      if (counts[inc.tier_level] !== undefined) counts[inc.tier_level]++;
    }

    const tWeekly: Record<number, string> = {};
    const tMonthly: Record<number, string> = {};
    for (let t = 1; t <= 5; t++) {
      tWeekly[t] = (counts[t] / totalWeeks).toFixed(1);
      tMonthly[t] = (counts[t] / totalMonths).toFixed(1);
    }

    return {
      avgWeeklyIncidents: totalCount / totalWeeks,
      avgWeeklyPoints: totalPts / totalWeeks,
      avgMonthlyIncidents: totalCount / totalMonths,
      avgMonthlyPoints: totalPts / totalMonths,
      tierWeeklyAverages: tWeekly,
      tierMonthlyAverages: tMonthly,
    };
  }, [incidents, totalWeeks, totalMonths]);

  // Selected Week Data & Days
  const weekData = useMemo(() => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay(); // 0 is Sunday
    const currentSunday = new Date(d);
    currentSunday.setDate(d.getDate() - dayOfWeek);

    const targetSunday = new Date(currentSunday);
    targetSunday.setDate(currentSunday.getDate() + weekOffset * 7);

    const days: {
      dateStr: string;
      dayName: string;
      dayNum: number;
      incidents: DashboardIncident[];
      maxTier: TierLevel;
      isToday: boolean;
      isFuture: boolean;
    }[] = [];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < 7; i++) {
      const iter = new Date(targetSunday);
      iter.setDate(targetSunday.getDate() + i);
      const dateStr = formatLocalDate(iter);
      const isFuture = iter > today;
      const isToday = dateStr === todayStr;

      const dayInc = isFuture
        ? []
        : incidents.filter((x) => x.logical_date === dateStr);

      const maxTier =
        dayInc.length > 0
          ? (Math.max(...dayInc.map((x) => x.tier_level)) as TierLevel)
          : 0;

      days.push({
        dateStr,
        dayName: dayNames[i],
        dayNum: iter.getDate(),
        incidents: dayInc,
        maxTier,
        isToday,
        isFuture,
      });
    }

    const startStr = formatLocalDate(targetSunday);
    const targetSaturday = new Date(targetSunday);
    targetSaturday.setDate(targetSunday.getDate() + 6);
    const endStr = formatLocalDate(targetSaturday);

    const matching = incidents.filter(
      (i) => i.logical_date >= startStr && i.logical_date <= endStr
    );

    const count = matching.length;
    const points = matching.reduce((sum, i) => sum + i.points, 0);

    const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const inc of matching) {
      if (tierCounts[inc.tier_level] !== undefined) tierCounts[inc.tier_level]++;
    }

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

    return { count, points, title, days, tierCounts };
  }, [today, todayStr, weekOffset, incidents]);

  // Selected Month Data & Days
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

    const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const inc of matching) {
      if (tierCounts[inc.tier_level] !== undefined) tierCounts[inc.tier_level]++;
    }

    // Generate Month Calendar Matrix (Sunday start)
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const totalDaysInMonth = lastDay;

    const calendarCells: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      incidents: DashboardIncident[];
      maxTier: TierLevel;
      isToday: boolean;
    }[] = [];

    // Leading padding from prev month
    for (let p = 0; p < firstDayOfWeek; p++) {
      calendarCells.push({
        dateStr: "",
        dayNum: 0,
        isCurrentMonth: false,
        incidents: [],
        maxTier: 0,
        isToday: false,
      });
    }

    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
      const dayInc = incidents.filter((x) => x.logical_date === dateStr);
      const maxTier =
        dayInc.length > 0
          ? (Math.max(...dayInc.map((x) => x.tier_level)) as TierLevel)
          : 0;

      calendarCells.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        incidents: dayInc,
        maxTier,
        isToday: dateStr === todayStr,
      });
    }

    const monthName = target.toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });

    let title = monthName;
    if (monthOffset === 0) title = `This Month (${monthName})`;
    else if (monthOffset === -1) title = `Last Month (${monthName})`;

    return { count, points, title, calendarCells, tierCounts };
  }, [today, todayStr, monthOffset, incidents]);

  const isWeek = tab === "week";
  const currentCount = isWeek ? weekData.count : monthData.count;
  const currentPoints = isWeek ? weekData.points : monthData.points;
  const currentTitle = isWeek ? weekData.title : monthData.title;
  const currentTierCounts = isWeek ? weekData.tierCounts : monthData.tierCounts;
  const currentTierAverages = isWeek ? tierWeeklyAverages : tierMonthlyAverages;

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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 45) {
      handlePrev();
    } else if (deltaX < -45 && canGoForward) {
      handleNext();
    }
    setTouchStartX(null);
  };

  const formatDelta = (delta: number, suffix: string = "") => {
    const val = Math.abs(delta).toFixed(1);
    if (Math.abs(delta) < 0.1) return "avg";
    if (delta < 0) return `-${val}${suffix} vs avg`;
    return `+${val}${suffix} vs avg`;
  };

  const deltaCountColor =
    deltaCount < -0.05
      ? "text-emerald-400"
      : deltaCount > 0.05
      ? "text-amber-400"
      : "text-muted";

  const deltaPointsColor =
    deltaPoints < -0.05
      ? "text-emerald-400"
      : deltaPoints > 0.05
      ? "text-amber-400"
      : "text-muted";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="bg-surface rounded-xl border border-border p-3.5 flex flex-col gap-3 select-none"
    >
      {/* Top Header: Tab Switcher & Navigation */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/70">
        <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-border">
          <button
            type="button"
            onClick={() => setTab("week")}
            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all ${
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
            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all ${
              tab === "month"
                ? "bg-accent text-zinc-950 font-bold shadow-sm"
                : "text-muted hover:text-main"
            }`}
          >
            Month
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-main truncate max-w-[170px] sm:max-w-none text-right">
            {currentTitle}
          </span>
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={handlePrev}
              title="Previous"
              className="p-1 rounded-md text-muted hover:text-main hover:bg-surface-subtle transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={!canGoForward}
              title="Next"
              className="p-1 rounded-md text-muted hover:text-main hover:bg-surface-subtle transition-colors disabled:opacity-25"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Compact Metrics Row (NO huge empty boxes!) */}
      <div className="flex items-center justify-between px-1 py-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted font-mono uppercase">Incidents:</span>
          <span className="text-lg font-bold font-mono text-main">{currentCount}</span>
          <span className={`text-xs font-mono ${deltaCountColor}`}>
            ({formatDelta(deltaCount)})
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted font-mono uppercase">Points:</span>
          <span className="text-lg font-bold font-mono text-main">{currentPoints}</span>
          <span className={`text-xs font-mono ${deltaPointsColor}`}>
            ({formatDelta(deltaPoints, " pts")})
          </span>
        </div>
      </div>

      {/* Calendar-Like Interface: What day each incident occurred */}
      {isWeek ? (
        /* Week View Calendar Mini-Row (7 Days: Sun to Sat) */
        <div className="grid grid-cols-7 gap-1 pt-1">
          {weekData.days.map((day) => {
            const hasIncidents = day.incidents.length > 0;
            const tierInfo = TIER_CONFIG[day.maxTier];

            return (
              <div
                key={day.dateStr}
                onClick={() =>
                  !day.isFuture && onSelectDate && onSelectDate(day.dateStr, day.incidents)
                }
                className={`flex flex-col items-center py-2 px-1 rounded-lg border transition-all ${
                  day.isFuture
                    ? "bg-surface-subtle/30 border-transparent opacity-30 cursor-default"
                    : "cursor-pointer bg-surface-subtle hover:bg-border/60 " +
                      (day.isToday ? "border-accent" : "border-border/60")
                }`}
              >
                <span className="text-xs text-muted font-mono">{day.dayName}</span>
                <span
                  className={`text-sm font-bold font-mono my-0.5 ${
                    day.isToday ? "text-accent" : "text-main"
                  }`}
                >
                  {day.dayNum}
                </span>

                {/* Status Indicator */}
                {hasIncidents ? (
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${tierInfo.colorClass}`}
                  >
                    {day.incidents.length}
                  </div>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-border my-1.5" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Month View Calendar Mini-Grid */
        <div className="pt-1">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono text-muted mb-1">
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthData.calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return <div key={idx} className="h-7 rounded" />;
              }

              const hasIncidents = cell.incidents.length > 0;
              const tierInfo = TIER_CONFIG[cell.maxTier];

              return (
                <div
                  key={idx}
                  onClick={() =>
                    onSelectDate && onSelectDate(cell.dateStr, cell.incidents)
                  }
                  className={`h-7 rounded flex flex-col items-center justify-center cursor-pointer transition-colors relative ${
                    cell.isToday
                      ? "ring-1 ring-accent bg-accent/10"
                      : "bg-surface-subtle hover:bg-border/50"
                  }`}
                >
                  <span className="text-xs font-mono text-main leading-none">
                    {cell.dayNum}
                  </span>
                  {hasIncidents && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${
                        cell.maxTier === 1
                          ? "bg-amber-400"
                          : cell.maxTier === 2
                          ? "bg-orange-400"
                          : cell.maxTier === 3
                          ? "bg-red-400"
                          : cell.maxTier === 4
                          ? "bg-purple-400"
                          : "bg-red-600"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-Color / Tier Breakdown & Averages */}
      <div className="pt-2 border-t border-border/60">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {([1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5)[]).map((tier) => {
            const count = currentTierCounts[tier] || 0;
            const avg = currentTierAverages[tier] || "0.0";
            const info = TIER_CONFIG[tier];

            return (
              <div
                key={tier}
                className="flex-1 min-w-[58px] p-1.5 rounded-md bg-surface-subtle border border-border/80 text-center flex flex-col justify-between"
              >
                <div className="flex items-center justify-center gap-1">
                  <span
                    className={`text-xs font-mono font-bold px-1 rounded ${info.colorClass}`}
                  >
                    L{tier}
                  </span>
                  <span className="text-xs font-mono font-bold text-main">{count}</span>
                </div>
                <span className="text-xs text-muted font-mono mt-0.5">
                  avg {avg}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
