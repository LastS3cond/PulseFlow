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

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIERS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
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

  // Index incidents by logical_date in O(N) for O(1) day lookups
  const incidentsByDate = useMemo(() => {
    const map = new Map<string, DashboardIncident[]>();
    for (let i = 0; i < incidents.length; i++) {
      const inc = incidents[i];
      const list = map.get(inc.logical_date);
      if (list) list.push(inc);
      else map.set(inc.logical_date, [inc]);
    }
    return map;
  }, [incidents]);

  // Historical spans, per-tier averages, and Option B Median Points baseline
  const {
    avgWeeklyIncidents,
    medianWeeklyPoints,
    avgMonthlyIncidents,
    medianMonthlyPoints,
    tierWeeklyAverages,
    tierMonthlyAverages,
  } = useMemo(() => {
    let start = inceptionDate ? new Date(inceptionDate) : today;
    const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (let i = 0; i < incidents.length; i++) {
      const inc = incidents[i];
      if (tierCounts[inc.tier_level] !== undefined) tierCounts[inc.tier_level]++;
      if (new Date(inc.logical_date) < start) start = new Date(inc.logical_date);
    }

    const diffMs = Math.max(0, today.getTime() - start.getTime());
    const totalWeeks = Math.max(1, Math.ceil(diffMs / 604800000));
    const totalMonths = Math.max(
      1,
      (today.getFullYear() - start.getFullYear()) * 12 +
        (today.getMonth() - start.getMonth()) +
        1
    );

    // Build timeline maps to compute median points per week and month (Option B)
    const currentSunday = new Date(today);
    currentSunday.setDate(today.getDate() - today.getDay());
    currentSunday.setHours(0, 0, 0, 0);

    const startSunday = new Date(start);
    startSunday.setDate(start.getDate() - start.getDay());
    startSunday.setHours(0, 0, 0, 0);

    const weekPointsMap = new Map<string, number>();
    const iterW = new Date(startSunday);
    while (iterW <= currentSunday) {
      weekPointsMap.set(formatLocalDate(iterW), 0);
      iterW.setDate(iterW.getDate() + 7);
    }

    const monthPointsMap = new Map<string, number>();
    const iterM = new Date(start.getFullYear(), start.getMonth(), 1);
    const endM = new Date(today.getFullYear(), today.getMonth(), 1);
    while (iterM <= endM) {
      const mKey = `${iterM.getFullYear()}-${String(iterM.getMonth() + 1).padStart(2, "0")}`;
      monthPointsMap.set(mKey, 0);
      iterM.setMonth(iterM.getMonth() + 1);
    }

    for (let i = 0; i < incidents.length; i++) {
      const inc = incidents[i];
      const [y, m, d] = inc.logical_date.split("-").map(Number);
      const incDate = new Date(y, m - 1, d);
      incDate.setDate(incDate.getDate() - incDate.getDay());
      const wKey = formatLocalDate(incDate);
      if (weekPointsMap.has(wKey)) {
        weekPointsMap.set(wKey, (weekPointsMap.get(wKey) || 0) + inc.points);
      }
      const mKey = inc.logical_date.slice(0, 7);
      if (monthPointsMap.has(mKey)) {
        monthPointsMap.set(mKey, (monthPointsMap.get(mKey) || 0) + inc.points);
      }
    }

    const medianWeeklyPoints = computeMedian(Array.from(weekPointsMap.values()));
    const medianMonthlyPoints = computeMedian(Array.from(monthPointsMap.values()));

    const tWeekly: Record<number, string> = {};
    const tMonthly: Record<number, string> = {};
    for (const t of TIERS) {
      tWeekly[t] = (tierCounts[t] / totalWeeks).toFixed(1);
      tMonthly[t] = (tierCounts[t] / totalMonths).toFixed(1);
    }

    const totalCount = incidents.length;
    return {
      avgWeeklyIncidents: totalCount / totalWeeks,
      medianWeeklyPoints,
      avgMonthlyIncidents: totalCount / totalMonths,
      medianMonthlyPoints,
      tierWeeklyAverages: tWeekly,
      tierMonthlyAverages: tMonthly,
    };
  }, [incidents, inceptionDate, today]);

  // Selected Week computation
  const weekData = useMemo(() => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay();
    const currentSunday = new Date(d);
    currentSunday.setDate(d.getDate() - dayOfWeek);

    const targetSunday = new Date(currentSunday);
    targetSunday.setDate(currentSunday.getDate() + weekOffset * 7);

    const days = [];
    let count = 0;
    let points = 0;
    const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (let i = 0; i < 7; i++) {
      const iter = new Date(targetSunday);
      iter.setDate(targetSunday.getDate() + i);
      const dateStr = formatLocalDate(iter);
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;

      const dayInc = isFuture ? [] : incidentsByDate.get(dateStr) || [];
      let maxTier: TierLevel = 0;

      if (dayInc.length > 0) {
        count += dayInc.length;
        for (let j = 0; j < dayInc.length; j++) {
          const inc = dayInc[j];
          points += inc.points;
          tierCounts[inc.tier_level] = (tierCounts[inc.tier_level] || 0) + 1;
          if (inc.tier_level > maxTier) maxTier = inc.tier_level;
        }
      }

      days.push({
        dateStr,
        dayName: DAY_NAMES[i],
        dayNum: iter.getDate(),
        incidents: dayInc,
        maxTier,
        isToday,
        isFuture,
      });
    }

    const targetSaturday = new Date(targetSunday);
    targetSaturday.setDate(targetSunday.getDate() + 6);

    const startLabel = targetSunday.toLocaleDateString([], { month: "short", day: "numeric" });
    const endLabel = targetSaturday.toLocaleDateString([], { month: "short", day: "numeric" });

    let title = `${startLabel} – ${endLabel}`;
    if (weekOffset === 0) title = "This Week";
    else if (weekOffset === -1) title = "Last Week";

    return { count, points, title, days, tierCounts };
  }, [today, todayStr, weekOffset, incidentsByDate]);

  // Selected Month computation
  const monthData = useMemo(() => {
    const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = target.getFullYear();
    const month = target.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const calendarCells = [];
    let count = 0;
    let points = 0;
    const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (let p = 0; p < firstDayOfWeek; p++) {
      calendarCells.push({ dateStr: "", dayNum: 0, isCurrentMonth: false, incidents: [], maxTier: 0 as TierLevel, isToday: false, isFuture: false });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isFuture = dateStr > todayStr;
      const dayInc = isFuture ? [] : incidentsByDate.get(dateStr) || [];
      let maxTier: TierLevel = 0;

      if (dayInc.length > 0) {
        count += dayInc.length;
        for (let j = 0; j < dayInc.length; j++) {
          const inc = dayInc[j];
          points += inc.points;
          tierCounts[inc.tier_level] = (tierCounts[inc.tier_level] || 0) + 1;
          if (inc.tier_level > maxTier) maxTier = inc.tier_level;
        }
      }

      calendarCells.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        incidents: dayInc,
        maxTier,
        isToday: dateStr === todayStr,
        isFuture,
      });
    }

    const monthName = target.toLocaleDateString([], { month: "long", year: "numeric" });
    const title = monthName;

    return { count, points, title, calendarCells, tierCounts };
  }, [today, todayStr, monthOffset, incidentsByDate]);

  const isWeek = tab === "week";
  const currentCount = isWeek ? weekData.count : monthData.count;
  const currentPoints = isWeek ? weekData.points : monthData.points;
  const currentTitle = isWeek ? weekData.title : monthData.title;
  const currentTierCounts = isWeek ? weekData.tierCounts : monthData.tierCounts;
  const currentTierAverages = isWeek ? tierWeeklyAverages : tierMonthlyAverages;

  const deltaCount = currentCount - (isWeek ? avgWeeklyIncidents : avgMonthlyIncidents);
  const deltaPoints = currentPoints - (isWeek ? medianWeeklyPoints : medianMonthlyPoints);

  const canGoForward = (isWeek ? weekOffset : monthOffset) < 0;

  const handlePrev = () => (isWeek ? setWeekOffset((p) => p - 1) : setMonthOffset((p) => p - 1));
  const handleNext = () => {
    if (!canGoForward) return;
    isWeek ? setWeekOffset((p) => p + 1) : setMonthOffset((p) => p + 1);
  };

  const formatDelta = (val: number, suffix = "") => {
    if (Math.abs(val) < 0.1) return "±0";
    return `${val > 0 ? "+" : "-"}${Math.abs(val).toFixed(1)}${suffix}`;
  };

  return (
    <div
      onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (diff > 45) handlePrev();
        else if (diff < -45 && canGoForward) handleNext();
        setTouchStartX(null);
      }}
      className="bg-surface rounded-xl border border-border p-3.5 flex flex-col gap-3 select-none"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/70">
        <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-border">
          <button
            type="button"
            onClick={() => setTab("week")}
            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all ${
              tab === "week" ? "bg-accent text-zinc-950 font-bold shadow-sm" : "text-muted hover:text-main"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setTab("month")}
            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all ${
              tab === "month" ? "bg-accent text-zinc-950 font-bold shadow-sm" : "text-muted hover:text-main"
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

      {/* Metrics Row */}
      <div className="flex items-center justify-between gap-1 px-1 py-0.5 text-xs">
        <div className="flex items-baseline gap-1.5 shrink-0 whitespace-nowrap">
          <span className="text-muted font-mono uppercase text-[11px]">Incidents:</span>
          <span className="text-base sm:text-lg font-bold font-mono text-main">{currentCount}</span>
          <span className={`font-mono text-[11px] sm:text-xs ${deltaCount < -0.05 ? "text-emerald-400" : deltaCount > 0.05 ? "text-amber-400" : "text-muted"}`}>
            ({formatDelta(deltaCount)})
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 shrink-0 whitespace-nowrap">
          <span className="text-muted font-mono uppercase text-[11px]">Points:</span>
          <span className="text-base sm:text-lg font-bold font-mono text-main">{currentPoints}</span>
          <span className={`font-mono text-[11px] sm:text-xs ${deltaPoints < -0.05 ? "text-emerald-400" : deltaPoints > 0.05 ? "text-amber-400" : "text-muted"}`}>
            ({formatDelta(deltaPoints, " pts")})
          </span>
        </div>
      </div>

      {/* Calendar View */}
      {isWeek ? (
        <div className="grid grid-cols-7 gap-1 pt-1">
          {weekData.days.map((day) => (
            <div
              key={day.dateStr}
              onClick={() => !day.isFuture && onSelectDate && onSelectDate(day.dateStr, day.incidents)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg border transition-all ${
                day.isFuture
                  ? "bg-surface-subtle/30 border-transparent opacity-30 cursor-default"
                  : "cursor-pointer bg-surface-subtle hover:bg-border/60 " + (day.isToday ? "border-accent" : "border-border/60")
              }`}
            >
              <span className="text-xs text-muted font-mono">{day.dayName}</span>
              <span className={`text-sm font-bold font-mono my-0.5 ${day.isToday ? "text-accent" : "text-main"}`}>
                {day.dayNum}
              </span>
              {day.incidents.length > 0 ? (
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${TIER_CONFIG[day.maxTier].colorClass}`}>
                  {day.incidents.length}
                </div>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-border my-1.5" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="pt-1">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono text-muted mb-1">
            {DAY_NAMES.map((d, i) => (
              <span key={i}>{d[0]}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthData.calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) return <div key={idx} className="h-7 rounded" />;
              return (
                <div
                  key={idx}
                  onClick={() => !cell.isFuture && onSelectDate && onSelectDate(cell.dateStr, cell.incidents)}
                  className={`h-7 rounded flex flex-col items-center justify-center transition-colors relative ${
                    cell.isFuture
                      ? "bg-surface-subtle/30 opacity-25 cursor-default pointer-events-none"
                      : "cursor-pointer " + (cell.isToday ? "ring-1 ring-accent bg-accent/10" : "bg-surface-subtle hover:bg-border/50")
                  }`}
                >
                  <span className={`text-xs font-mono leading-none -translate-y-[1px] ${cell.isToday ? "text-accent font-bold" : "text-main"}`}>
                    {cell.dayNum}
                  </span>
                  {cell.incidents.length > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${
                        cell.maxTier === 1
                          ? "bg-yellow-400"
                          : cell.maxTier === 2
                          ? "bg-orange-400"
                          : cell.maxTier === 3
                          ? "bg-red-500"
                          : cell.maxTier === 4
                          ? "bg-purple-400"
                          : "bg-black ring-1 ring-white"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-Color Breakdown */}
      <div className="pt-2 border-t border-border/60">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {TIERS.map((tier) => (
            <div
              key={tier}
              className="flex-1 min-w-[58px] p-1.5 rounded-md bg-surface-subtle border border-border/80 text-center flex flex-col justify-between"
            >
              <div className="flex items-center justify-center gap-1">
                <span className={`text-xs font-mono font-bold px-1 rounded ${TIER_CONFIG[tier].colorClass}`}>
                  L{tier}
                </span>
                <span className="text-xs font-mono font-bold text-main">{currentTierCounts[tier] || 0}</span>
              </div>
              <span className="text-xs text-muted font-mono mt-0.5">
                median {currentTierAverages[tier] || "0.0"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
