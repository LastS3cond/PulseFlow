"use client";

import React, { useState, useMemo } from "react";
import { DashboardIncident } from "@/app/actions/incidents";
import { formatDisplayDate, formatLocalDate } from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeatmapGridProps {
  incidents: DashboardIncident[];
  inceptionDate?: string;
  onSelectDate: (dateStr: string, incidentsForDate: DashboardIncident[]) => void;
}

interface DayData {
  dateStr: string;
  dayNum: number;
  inCurrentYear: boolean;
  incidents: DashboardIncident[];
  maxTier: TierLevel;
  totalPoints: number;
  isToday: boolean;
  isFuture: boolean;
  isBeforeFirstLog: boolean;
}

export function HeatmapGrid({
  incidents,
  inceptionDate,
  onSelectDate,
}: HeatmapGridProps) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatLocalDate(today), [today]);
  const currentYear = today.getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Group incidents by logical_date
  const incidentsByDate = useMemo(() => {
    const map = new Map<string, DashboardIncident[]>();
    for (const inc of incidents) {
      const existing = map.get(inc.logical_date) || [];
      existing.push(inc);
      map.set(inc.logical_date, existing);
    }
    return map;
  }, [incidents]);

  // Determine earliest recorded date across history
  const firstLogDate = useMemo(() => {
    let earliest = inceptionDate ? inceptionDate.slice(0, 10) : todayStr;
    for (const inc of incidents) {
      if (inc.logical_date < earliest) {
        earliest = inc.logical_date;
      }
    }
    return earliest;
  }, [incidents, inceptionDate, todayStr]);

  // Build calendar matrix for selectedYear: Jan 1 to Dec 31
  const { weeks, monthHeaders } = useMemo(() => {
    const jan1 = new Date(selectedYear, 0, 1);
    const dec31 = new Date(selectedYear, 11, 31);

    // Week starts on Sunday
    const startSunday = new Date(jan1);
    startSunday.setDate(jan1.getDate() - jan1.getDay());

    const endSaturday = new Date(dec31);
    endSaturday.setDate(dec31.getDate() + (6 - dec31.getDay()));

    const totalDays =
      Math.round(
        (endSaturday.getTime() - startSunday.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    const numWeeks = Math.ceil(totalDays / 7);

    const weeksArray: DayData[][] = [];
    const months: { name: string; weekIndex: number }[] = [];
    let lastTrackedMonth = -1;

    let iter = new Date(startSunday);
    for (let w = 0; w < numWeeks; w++) {
      const currentWeek: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const inYear = iter.getFullYear() === selectedYear;
        const dateStr = formatLocalDate(iter);
        const isFuture = dateStr > todayStr;
        const isBefore = dateStr < firstLogDate;
        const isToday = dateStr === todayStr;

        const dayInc =
          inYear && !isFuture ? incidentsByDate.get(dateStr) || [] : [];

        let maxTier: TierLevel = 0;
        let totalPoints = 0;
        if (dayInc.length > 0) {
          maxTier = Math.max(...dayInc.map((i) => i.tier_level)) as TierLevel;
          totalPoints = dayInc.reduce((sum, i) => sum + i.points, 0);
        }

        // Track month label on the 1st of each month (Jan through Dec)
        if (inYear && iter.getMonth() !== lastTrackedMonth) {
          lastTrackedMonth = iter.getMonth();
          months.push({
            name: iter.toLocaleDateString([], { month: "short" }),
            weekIndex: w,
          });
        }

        currentWeek.push({
          dateStr,
          dayNum: iter.getDate(),
          inCurrentYear: inYear,
          incidents: dayInc,
          maxTier,
          totalPoints,
          isToday,
          isFuture,
          isBeforeFirstLog: isBefore,
        });

        iter.setDate(iter.getDate() + 1);
      }
      weeksArray.push(currentWeek);
    }

    return { weeks: weeksArray, monthHeaders: months };
  }, [selectedYear, todayStr, firstLogDate, incidentsByDate]);

  // Determine cell appearance
  const getCellClasses = (day: DayData) => {
    // Padding days outside the year
    if (!day.inCurrentYear) {
      return "invisible pointer-events-none";
    }

    // Days in future or days before first log: EMPTY
    if (day.isFuture || day.isBeforeFirstLog) {
      return "bg-transparent border border-dashed border-border/30 cursor-default opacity-25";
    }

    // Active logging days:
    const base = "cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10 ";
    const todayRing = day.isToday ? "ring-1 ring-accent" : "";

    // Default logging (0 incidents) is WHITE
    if (day.incidents.length === 0) {
      return `${base} bg-zinc-100 border border-zinc-200 hover:bg-white ${todayRing}`;
    }

    // Color-coded severity white to black
    switch (day.maxTier) {
      case 1:
        return `${base} bg-amber-400 border border-amber-500 hover:bg-amber-300 ${todayRing}`;
      case 2:
        return `${base} bg-orange-500 border border-orange-600 hover:bg-orange-400 ${todayRing}`;
      case 3:
        return `${base} bg-red-500 border border-red-600 hover:bg-red-400 ${todayRing}`;
      case 4:
        return `${base} bg-purple-600 border border-purple-700 hover:bg-purple-500 ${todayRing}`;
      case 5:
        return `${base} bg-black border border-red-600 hover:bg-zinc-900 ${todayRing}`;
      default:
        return `${base} bg-zinc-100 border border-zinc-200 ${todayRing}`;
    }
  };

  const handlePrevYear = () => {
    setSelectedYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    if (selectedYear < currentYear) {
      setSelectedYear((prev) => prev + 1);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-3.5 sm:p-4 flex flex-col gap-3">
      {/* Header and Year Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-main">Yearly heatmap</h2>
          <p className="text-xs text-muted">
            Severity is color-coded white to black. Pips reflect incident amount
          </p>
        </div>

        {/* Year Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-border">
            <button
              onClick={handlePrevYear}
              title="Previous Year"
              className="p-1 rounded-md text-muted hover:text-main hover:bg-border/60 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-bold text-main">
              {selectedYear}
            </span>
            <button
              onClick={handleNextYear}
              disabled={selectedYear >= currentYear}
              title="Next Year"
              className="p-1 rounded-md text-muted hover:text-main hover:bg-border/60 transition-colors disabled:opacity-25"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Jan -> Dec Calendar Grid Container */}
      <div className="overflow-x-auto pb-2 pt-1 scrollbar-thin">
        <div className="min-w-[760px]">
          {/* Month labels Jan -> Dec */}
          <div className="flex text-xs text-muted font-mono mb-1.5 ml-6">
            {monthHeaders.map((m, idx) => (
              <div
                key={idx}
                style={{ width: `${(1 / 12) * 100}%` }}
                className="truncate"
              >
                {m.name}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Day of week labels */}
            <div className="flex flex-col justify-between text-xs text-muted font-mono pr-1 select-none py-0.5 h-[104px]">
              <span>S</span>
              <span>T</span>
              <span>T</span>
              <span>S</span>
            </div>

            {/* Weeks columns */}
            <div className="flex gap-1 flex-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1 flex-1">
                  {week.map((day, dIdx) => (
                    <div
                      key={dIdx}
                      onClick={() =>
                        day.inCurrentYear &&
                        !day.isFuture &&
                        !day.isBeforeFirstLog &&
                        onSelectDate(day.dateStr, day.incidents)
                      }
                      title={
                        day.inCurrentYear && !day.isFuture && !day.isBeforeFirstLog
                          ? `${formatDisplayDate(day.dateStr)}: ${
                              day.incidents.length === 0
                                ? "Clean (Pure Focus)"
                                : `L${day.maxTier} (${day.incidents.length} event${
                                    day.incidents.length > 1 ? "s" : ""
                                  }, ${day.totalPoints} pts)`
                            }`
                          : ""
                      }
                      className={`w-full aspect-square rounded-[3px] ${getCellClasses(day)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Legend Info */}
      <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-border/50">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-zinc-100 border border-zinc-300 inline-block" />
            <span>Focus (0)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-400 inline-block" />
            <span>L1</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-orange-500 inline-block" />
            <span>L2</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-red-500 inline-block" />
            <span>L3</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-purple-600 inline-block" />
            <span>L4</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-black border border-red-600 inline-block" />
            <span>L5</span>
          </span>
        </div>

        <span className="font-mono text-xs text-muted">
          Empty = Unrecorded / Future
        </span>
      </div>
    </div>
  );
}
