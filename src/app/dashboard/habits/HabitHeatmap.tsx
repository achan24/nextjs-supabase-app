"use client";
import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { format, subDays, startOfWeek, eachDayOfInterval, isSameDay } from "date-fns";

function getPaddedDates() {
  const today = new Date();
  // 52 past weeks + current week = 371 days
  const start = startOfWeek(subDays(today, 370), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: today }).map(d =>
    format(d, "yyyy-MM-dd")
  );
}

// GitHub green palette
const githubPalette = [
  "#ebedf0", // 0
  "#9be9a8", // 1
  "#40c463", // 2
  "#30a14e", // 3
  "#216e39", // 4+
];
function getColor(count: number) {
  if (count === 0) return githubPalette[0];
  if (count === 1) return githubPalette[1];
  if (count === 2) return githubPalette[2];
  if (count === 3) return githubPalette[3];
  return githubPalette[4];
}

export default function HabitHeatmap({ habitId, userId }: { habitId: string, userId: string }) {
  const [loading, setLoading] = useState(true);
  const [dateCounts, setDateCounts] = useState<{ [date: string]: number }>({});

  useEffect(() => {
    const fetchCompletions = async () => {
      setLoading(true);
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from("habit_completions")
        .select("completed_at")
        .eq("habit_id", habitId)
        .eq("user_id", userId);
      if (error) {
        setDateCounts({});
        setLoading(false);
        return;
      }
      // Count completions per date
      const counts: { [date: string]: number } = {};
      for (const row of data) {
        const date = row.completed_at.slice(0, 10); // YYYY-MM-DD
        counts[date] = (counts[date] || 0) + 1;
      }
      setDateCounts(counts);
      setLoading(false);
    };
    fetchCompletions();
  }, [habitId, userId]);

  const dates = getPaddedDates();
  // Arrange into columns (weeks)
  const weeks: string[][] = [];
  for (let i = 0; i < Math.ceil(dates.length / 7); i++) {
    weeks.push(dates.slice(i * 7, (i + 1) * 7));
  }

  // Month labels: show above the first column where the month of the first day of the week changes
  const monthLabels: { [col: number]: string } = {};
  let lastMonth: number | null = null;
  weeks.forEach((week, colIdx) => {
    const firstDate = week[0];
    const month = new Date(firstDate).getMonth();
    if (month !== lastMonth) {
      monthLabels[colIdx] = format(new Date(firstDate), "MMM");
      lastMonth = month;
    }
  });

  // Only show Mon, Wed, Fri for compactness
  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];

  return (
    <div>
      {/* Month labels with offset for day labels */}
      <div className="flex ml-[30px] mb-0.5">
        <div style={{ width: 28 }} />
        {weeks.map((_, colIdx) => (
          <div key={colIdx} style={{ width: 12 }} className="h-3 flex items-center justify-center">
            <span className="text-[10px] text-gray-500 leading-none">
              {monthLabels[colIdx] || ""}
            </span>
          </div>
        ))}
      </div>
      <div className="flex">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-[2px] mr-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-3 w-7 flex items-center justify-end">
              <span className="text-[10px] text-gray-500 leading-none">{label}</span>
            </div>
          ))}
        </div>
        {/* Heatmap grid */}
        <div className="flex gap-[2px]">
          {weeks.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-[2px]">
              {week.map((date, rowIdx) => (
                <div
                  key={date}
                  style={{ background: getColor(dateCounts[date] || 0), borderRadius: 0, width: 12, height: 12 }}
                  title={`${date}: ${dateCounts[date] || 0} completions`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {loading && <div className="text-gray-400 text-xs mt-2">Loading heatmap...</div>}
    </div>
  );
} 