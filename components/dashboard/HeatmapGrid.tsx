"use client";

import React, { useMemo } from "react";
import { DashboardIncident } from "@/app/actions/incidents";
import { formatDisplayDate, formatLocalDate } from "@/lib/telemetry/time";
import { TIER_CONFIG, TierLevel } from "@/lib/types";

interface HeatmapGridProps {
  incidents: DashboardIncident[];
  onSelectDate: (dateStr: string, incidentsForDate: DashboardIncident[]) => void;
}

interface DayData {
  dateStr: string;
  dayOfWeek: number;
  incidents: DashboardIncident[];
  maxTier: TierLevel;
  totalPoints: number;
  isToday: boolean;
  isFuture: boolean;
}

export function HeatmapGrid({ incidents, onSelectDate }: HeatmapGridProps) {
  const incidentsByDate = useMemo(() => {
    const map = new Map<string, DashboardIncident[]>();
    for (const inc of incidents) {
      const existing = map.get(inc.logical_date) || [];
      existing.push(inc);
      map.set(inc.logical_date, existing);
    }
    return map;
  }, [incidents]);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));

    const numWeeks = 53;
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - (numWeeks * 7 - 1));

    const weeksArray: DayData[][] = [];
    const months: { name: string; weekIndex: number }[] = [];
    let currentMonth = -1;

    let iter = new Date(startDate);
    for (let w = 0; w < numWeeks; w++) {
      const currentWeek: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = formatLocalDate(iter);
        const isFuture = iter > today;
        const isToday = iter.getTime() === today.getTime();
        const dayIncidents = isFuture ? [] : (incidentsByDate.get(dateStr) || []);

        let maxTier: TierLevel = 0;
        let totalPoints = 0;
        if (dayIncidents.length > 0) {
          maxTier = Math.max(...dayIncidents.map((i) => i.tier_level)) as TierLevel;
          totalPoints = dayIncidents.reduce((sum, i) => sum + i.points, 0);
        }

        if (d === 0 && iter.getMonth() !== currentMonth) {
          currentMonth = iter.getMonth();
          months.push({
            name: iter.toLocaleDateString([], { month: "short" }),
            weekIndex: w,
          });
        }

        currentWeek.push({
          dateStr,
          dayOfWeek: iter.getDay(),
          incidents: dayIncidents,
          maxTier,
          totalPoints,
          isToday,
          isFuture,
        });

        iter.setDate(iter.getDate() + 1);
      }
      weeksArray.push(currentWeek);
    }

    return { weeks: weeksArray, monthLabels: months };
  }, [incidentsByDate]);

  const getCellClasses = (day: DayData) => {
    if (day.isFuture) {
      return "bg-transparent border border-dashed border-border/20 cursor-default opacity-20";
    }

    const base = "cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10 ";
    const todayRing = day.isToday ? "ring-1 ring-accent" : "";

    switch (day.maxTier) {
      case 0:
        return `${base} bg-surface-subtle/80 border border-border/50 hover:border-muted/50 ${todayRing}`;
      case 1:
        return `${base} bg-amber-500/25 border border-amber-500/50 hover:bg-amber-500/40 ${todayRing}`;
      case 2:
        return `${base} bg-orange-500/30 border border-orange-500/60 hover:bg-orange-500/50 ${todayRing}`;
      case 3:
        return `${base} bg-red-500/35 border border-red-500/70 hover:bg-red-500/50 ${todayRing}`;
      case 4:
        return `${base} bg-purple-500/40 border border-purple-500/70 hover:bg-purple-500/60 ${todayRing}`;
      case 5:
        return `${base} bg-red-950 border border-red-600 hover:bg-red-900 ${todayRing}`;
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4 flex flex-col gap-3">
      {/* Header and stats */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-main">Yearly heatmap</h2>
          <p className="text-xs text-muted">
            Severity is color-coded white to black. Pips reflect incident amount
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {([0, 1, 2, 3, 4, 5] as TierLevel[]).map((tier) => (
            <span
              key={tier}
              className={`px-1.5 py-0.5 rounded font-bold ${TIER_CONFIG[tier].colorClass}`}
            >
              L{tier}
            </span>
          ))}
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="overflow-x-auto pb-2 pt-1 scrollbar-thin">
        <div className="min-w-[760px]">
          {/* Month labels */}
          <div className="flex text-xs text-muted font-mono mb-1.5 ml-6">
            {monthLabels.map((m, idx) => (
              <div
                key={idx}
                style={{ width: `${(m.weekIndex / weeks.length) * 100}%` }}
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
                  {week.map((day) => (
                    <div
                      key={day.dateStr}
                      onClick={() => !day.isFuture && onSelectDate(day.dateStr, day.incidents)}
                      title={`${formatDisplayDate(day.dateStr)}: ${
                        day.incidents.length === 0
                          ? "L0 Pure Focus"
                          : `L${day.maxTier} (${day.incidents.length} events, ${day.totalPoints} pts)`
                      }`}
                      className={`w-full aspect-square rounded-[3px] ${getCellClasses(day)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
