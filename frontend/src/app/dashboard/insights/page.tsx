"use client"
import { useEffect, useState } from "react"
import { getTimeline, getTimeOfDay, getDayOfWeek } from "@/lib/api"
import type { TimelinePoint } from "@/types"
import MoodTimeline from "@/components/charts/MoodTimeline"
import MoodForecast from "@/components/dashboard/MoodForecast"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { useTheme } from "@/lib/theme"

function valenceColor(v: number) {
  if (v > 0.2) return "#10b981"
  if (v > -0.1) return "#7c3aed"
  return "#f87171"
}

function HourChart({ data }: { data: { hour: number; avg_valence: number; count: number }[] }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const axisColor = isDark ? "#44445a" : "#94a3b8"
  const full = Array.from({ length: 24 }, (_, h) => {
    const found = data.find(d => d.hour === h)
    return { hour: h, avg_valence: found?.avg_valence ?? null, count: found?.count ?? 0,
      label: h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm` }
  })
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={full} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false}
          interval={2} />
        <YAxis domain={[-1, 1]} hide />
        <Tooltip
          contentStyle={{ background: isDark ? "#111118" : "#fff", border: `1px solid ${isDark ? "#1e1e2a" : "#e2e8f0"}`, borderRadius: 8, fontSize: 11 }}
          formatter={(v: unknown) => typeof v === "number" ? [v.toFixed(2), "Avg mood"] : ["-", "No data"]}
          labelFormatter={(l) => l}
        />
        <Bar dataKey="avg_valence" radius={[3, 3, 0, 0]}>
          {full.map((d, i) => (
            <Cell key={i} fill={d.avg_valence !== null ? valenceColor(d.avg_valence) : (isDark ? "#1e1e2a" : "#f1f5f9")} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DayChart({ data }: { data: { day: string; avg_valence: number; count: number }[] }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const axisColor = isDark ? "#44445a" : "#94a3b8"
  const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const full = order.map(d => data.find(r => r.day === d) ?? { day: d, avg_valence: 0, count: 0 })
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={full} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
        <YAxis domain={[-1, 1]} hide />
        <Tooltip
          contentStyle={{ background: isDark ? "#111118" : "#fff", border: `1px solid ${isDark ? "#1e1e2a" : "#e2e8f0"}`, borderRadius: 8, fontSize: 11 }}
          formatter={(v: unknown) => typeof v === "number" ? [v.toFixed(2), "Avg mood"] : ["-", "No data"]}
        />
        <Bar dataKey="avg_valence" radius={[3, 3, 0, 0]}>
          {full.map((d, i) => (
            <Cell key={i} fill={valenceColor(d.avg_valence)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function InsightsPage() {
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [days, setDays]         = useState(30)
  const [hourData, setHourData] = useState<{ hour: number; avg_valence: number; count: number }[]>([])
  const [dowData, setDowData]   = useState<{ day: string; dow: number; avg_valence: number; count: number }[]>([])

  useEffect(() => {
    getTimeline(days).then(setTimeline).catch(() => {})
    getTimeOfDay().then(setHourData).catch(() => {})
    getDayOfWeek().then(setDowData).catch(() => {})
  }, [days])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Insights</h1>
        <p className="text-sm text-slate-400 mt-0.5">Patterns in your lyrical mood over time</p>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Mood Timeline</h2>
            <p className="text-xs text-slate-400 mt-0.5">Daily lyrical mood · based on song lyrics, not musical sound</p>
          </div>
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="bg-slate-50 dark:bg-[#1a1a22] border border-slate-200 dark:border-[#2a2a38] text-slate-700 dark:text-slate-300 text-sm rounded-lg px-3 py-1.5 outline-none">
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 3 months</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>All time</option>
          </select>
        </div>
        <MoodTimeline data={timeline} />
      </div>

      {/* Forecast */}
      <MoodForecast />

      {/* Time of day + Day of week */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">Time of Day</h2>
          <p className="text-xs text-slate-400 mb-4">Lyrical mood by hour · when do your songs get heavy?</p>
          {hourData.length > 0
            ? <HourChart data={hourData} />
            : <p className="text-sm text-slate-400 text-center py-10">Not enough data yet — keep syncing</p>}
        </div>
        <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">Day of Week</h2>
          <p className="text-xs text-slate-400 mb-4">Lyrical mood by weekday · Monday blues or Friday energy?</p>
          {dowData.length > 0
            ? <DayChart data={dowData} />
            : <p className="text-sm text-slate-400 text-center py-10">Not enough data yet — keep syncing</p>}
        </div>
      </div>
    </div>
  )
}
