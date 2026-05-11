"use client"
import { useEffect, useState } from "react"
import { getTimeline, getTimeOfDay, getDayOfWeek } from "@/lib/api"
import type { TimelinePoint } from "@/types"
import MoodTimeline from "@/components/charts/MoodTimeline"
import MoodForecast from "@/components/dashboard/MoodForecast"
import { useTheme } from "@/lib/theme"

/* ── helpers ─────────────────────────────────────────── */
function moodLabel(v: number): { text: string; color: string } {
  if (v > 0.3)  return { text: "Uplifting",  color: "#10b981" }
  if (v > 0.05) return { text: "Slightly uplifting", color: "#34d399" }
  if (v > -0.1) return { text: "Neutral",    color: "#7c3aed" }
  if (v > -0.3) return { text: "Slightly heavy", color: "#f59e0b" }
  return              { text: "Heavy",       color: "#f87171" }
}

/** A centred bar: negative → fills left (red), positive → fills right (green) */
function ValenceBar({ value }: { value: number }) {
  const pct   = Math.abs(value) * 50   // max 50% each side
  const isPos = value >= 0
  const color = moodLabel(value).color
  return (
    <div className="flex items-center gap-1.5 flex-1">
      {/* left half */}
      <div className="flex-1 h-2 bg-slate-100 dark:bg-[#1e1e2a] rounded-l-full overflow-hidden flex justify-end">
        {!isPos && (
          <div className="h-full rounded-l-full" style={{ width: `${pct * 2}%`, background: color }} />
        )}
      </div>
      {/* centre divider */}
      <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 shrink-0" />
      {/* right half */}
      <div className="flex-1 h-2 bg-slate-100 dark:bg-[#1e1e2a] rounded-r-full overflow-hidden">
        {isPos && (
          <div className="h-full rounded-r-full" style={{ width: `${pct * 2}%`, background: color }} />
        )}
      </div>
    </div>
  )
}

/* ── Time-of-Day card ────────────────────────────────── */
function TimeOfDayCard({ data }: { data: { hour: number; avg_valence: number; count: number }[] }) {
  if (data.length < 2) return (
    <p className="text-sm text-slate-400 text-center py-8">
      Sync across more hours to see patterns here.
    </p>
  )

  const heaviest  = data.reduce((a, b) => a.avg_valence < b.avg_valence ? a : b)
  const lightest  = data.reduce((a, b) => a.avg_valence > b.avg_valence ? a : b)
  const fmtHour   = (h: number) => h === 0 ? "midnight" : h < 12 ? `${h}am` : h === 12 ? "noon" : `${h - 12}pm`

  const insight = heaviest.avg_valence === lightest.avg_valence
    ? "Your lyrical mood is consistent throughout the day."
    : `Your lyrically heaviest listening is around ${fmtHour(heaviest.hour)}, lightest around ${fmtHour(lightest.hour)}.`

  return (
    <div className="space-y-4">
      <p className="text-sm text-violet-400 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 rounded-xl px-3 py-2.5 leading-snug">
        💡 {insight}
      </p>
      <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
        <span className="text-[#f87171]">← Heavy</span>
        <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
        <span className="text-[#10b981]">Uplifting →</span>
      </div>
      <div className="space-y-2">
        {data.map(d => {
          const mood = moodLabel(d.avg_valence)
          const label = fmtHour(d.hour)
          return (
            <div key={d.hour} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-14 shrink-0 text-right">{label}</span>
              <ValenceBar value={d.avg_valence} />
              <span className="text-xs w-20 shrink-0" style={{ color: mood.color }}>{mood.text}</span>
              <span className="text-[10px] text-slate-400 w-12 text-right tabular-nums shrink-0">{d.count} plays</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Day-of-Week card ────────────────────────────────── */
function DayOfWeekCard({ data }: { data: { day: string; dow: number; avg_valence: number; count: number }[] }) {
  if (data.length < 2) return (
    <p className="text-sm text-slate-400 text-center py-8">
      Sync across more days to see patterns here.
    </p>
  )

  const heaviest = data.reduce((a, b) => a.avg_valence < b.avg_valence ? a : b)
  const lightest  = data.reduce((a, b) => a.avg_valence > b.avg_valence ? a : b)
  const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const sorted = [...data].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day))

  const insight = heaviest.avg_valence === lightest.avg_valence
    ? "Your lyrical mood is consistent across the week."
    : `Your lyrically heaviest listening day is ${heaviest.day}, lightest is ${lightest.day}.`

  return (
    <div className="space-y-4">
      <p className="text-sm text-violet-400 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 rounded-xl px-3 py-2.5 leading-snug">
        💡 {insight}
      </p>
      <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
        <span className="text-[#f87171]">← Heavy</span>
        <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
        <span className="text-[#10b981]">Uplifting →</span>
      </div>
      <div className="space-y-2">
        {sorted.map(d => {
          const mood = moodLabel(d.avg_valence)
          return (
            <div key={d.day} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-8 shrink-0">{d.day}</span>
              <ValenceBar value={d.avg_valence} />
              <span className="text-xs w-20 shrink-0" style={{ color: mood.color }}>{mood.text}</span>
              <span className="text-[10px] text-slate-400 w-12 text-right tabular-nums shrink-0">{d.count} plays</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────── */
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
            <p className="text-xs text-slate-400 mt-0.5">Daily lyrical mood · based on lyrics, not musical sound</p>
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
          <p className="text-xs text-slate-400 mb-4">When do you listen to lyrically heavier vs lighter music?</p>
          <TimeOfDayCard data={hourData} />
        </div>
        <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">Day of Week</h2>
          <p className="text-xs text-slate-400 mb-4">Do your lyrics get heavier on certain days of the week?</p>
          <DayOfWeekCard data={dowData} />
        </div>
      </div>
    </div>
  )
}
