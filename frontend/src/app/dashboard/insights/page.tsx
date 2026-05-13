"use client"
import { useEffect, useState } from "react"
import { getTimeline, getTimeOfDay, getDayOfWeek } from "@/lib/api"
import type { TimelinePoint } from "@/types"
import MoodForecast from "@/components/dashboard/MoodForecast"

function moodLabel(v: number): { text: string; color: string; bgColor: string } {
  if (v > 0.3)  return { text: "Uplifting",         color: "#10b981", bgColor: "bg-[#10b981]" }
  if (v > 0.05) return { text: "Optimistic",         color: "#ffb784", bgColor: "bg-tertiary" }
  if (v > -0.1) return { text: "Neutral",            color: "#d2bbff", bgColor: "bg-primary" }
  if (v > -0.3) return { text: "Melancholic",        color: "#ffb4ab", bgColor: "bg-error" }
  return              { text: "Heavy",               color: "#ffb4ab", bgColor: "bg-error" }
}

function ValenceBar({ value }: { value: number }) {
  const pct    = Math.abs(value) * 50
  const isPos  = value >= 0
  const color  = moodLabel(value).color
  return (
    <div className="col-span-6 h-1.5 bg-surface-variant rounded-full relative overflow-hidden flex items-center">
      {!isPos && (
        <div className="absolute h-full right-1/2 rounded-l-sm" style={{ width: `${pct * 2}%`, backgroundColor: color }} />
      )}
      {isPos && (
        <div className="absolute h-full left-1/2 rounded-r-sm" style={{ width: `${pct * 2}%`, backgroundColor: color }} />
      )}
      <div className="w-px h-3 bg-outline absolute left-1/2" />
    </div>
  )
}

function TimeOfDayCard({ data }: { data: { hour: number; avg_valence: number; count: number }[] }) {
  const fmtHour = (h: number) =>
    h === 0 ? "12 AM" : h < 10 ? `0${h} ${h < 12 ? "AM" : "PM"}` : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`

  if (data.length < 2) return (
    <div className="flex items-center justify-center py-12 text-on-surface-variant text-sm">
      Sync across more hours to see time-of-day patterns.
    </div>
  )

  const heaviest = data.reduce((a, b) => a.avg_valence < b.avg_valence ? a : b)
  const lightest  = data.reduce((a, b) => a.avg_valence > b.avg_valence ? a : b)
  const insight = heaviest.avg_valence === lightest.avg_valence
    ? "Your lyrical mood is consistent throughout the day."
    : `Your lyrically heaviest listening is around ${fmtHour(heaviest.hour)}, lightest around ${fmtHour(lightest.hour)}.`

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto pr-1">
        {data.map(d => {
          const mood = moodLabel(d.avg_valence)
          return (
            <div key={d.hour} className="grid grid-cols-12 items-center py-1.5 border-b border-outline-variant/30">
              <span className="col-span-2 font-geist text-[11px] text-on-surface-variant">{fmtHour(d.hour)}</span>
              <ValenceBar value={d.avg_valence} />
              <span className="col-span-2 text-center font-geist text-[10px] tracking-wider uppercase" style={{ color: mood.color }}>
                {mood.text}
              </span>
              <span className="col-span-2 text-right font-geist text-[11px] text-on-surface-variant">{d.count}</span>
            </div>
          )
        })}
      </div>
      <div className="bg-surface-container-high border-l-4 border-primary p-4 rounded-lg">
        <div className="flex gap-3 items-start">
          <span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
          <p className="text-[14px] text-on-surface">{insight}</p>
        </div>
      </div>
    </div>
  )
}

function DayOfWeekCard({ data }: { data: { day: string; dow: number; avg_valence: number; count: number }[] }) {
  if (data.length < 2) return (
    <div className="flex items-center justify-center py-12 text-on-surface-variant text-sm">
      Sync across more days to see weekly patterns.
    </div>
  )

  const heaviest = data.reduce((a, b) => a.avg_valence < b.avg_valence ? a : b)
  const lightest  = data.reduce((a, b) => a.avg_valence > b.avg_valence ? a : b)
  const order     = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
  const sorted    = [...data].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day))
  const insight   = heaviest.avg_valence === lightest.avg_valence
    ? "Your lyrical mood is consistent across the week."
    : `Your lyrically heaviest listening day is ${heaviest.day}, lightest is ${lightest.day}.`

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        {sorted.map(d => {
          const mood = moodLabel(d.avg_valence)
          return (
            <div key={d.day} className="grid grid-cols-12 items-center py-2 border-b border-outline-variant/30">
              <span className="col-span-2 font-geist text-[11px] tracking-wider uppercase text-on-surface-variant">{d.day.toUpperCase()}</span>
              <ValenceBar value={d.avg_valence} />
              <span className="col-span-2 text-center font-geist text-[10px] tracking-wider uppercase" style={{ color: mood.color }}>
                {mood.text}
              </span>
              <span className="col-span-2 text-right font-geist text-[11px] text-on-surface-variant">{d.count}</span>
            </div>
          )
        })}
      </div>
      <div className="bg-surface-container-high border-l-4 border-tertiary p-4 rounded-lg">
        <div className="flex gap-3 items-start">
          <span className="material-symbols-outlined text-tertiary text-[20px]">insights</span>
          <p className="text-[14px] text-on-surface">{insight}</p>
        </div>
      </div>
    </div>
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

  // Build normalized SVG path from timeline data
  const buildPath = (data: TimelinePoint[], field: "valence" | "energy" = "valence") => {
    if (data.length < 2) return ""
    const vals = data.map(d => (field === "valence" ? d.valence : (d as { energy?: number }).energy ?? 0))
    const minV  = Math.min(...vals)
    const maxV  = Math.max(...vals)
    const range = maxV - minV || 0.01
    const pts   = data.map((_, i) => {
      const x = (i / (data.length - 1)) * 1000
      const y = 280 - ((vals[i] - minV) / range) * 240
      return `${x},${y}`
    })
    return "M" + pts[0] + " " + pts.slice(1).map((p, i) => {
      const [px, py] = pts[i].split(",").map(Number)
      const [cx, cy] = p.split(",").map(Number)
      const mx = (px + cx) / 2
      return `C${mx},${py} ${mx},${cy} ${cx},${cy}`
    }).join(" ")
  }

  const timelineData  = timeline.slice(-30)
  const svgPath       = buildPath(timelineData)
  const closedPath    = svgPath ? `${svgPath} L1000,300 L0,300 Z` : ""

  const fmtAxisDate = (d: TimelinePoint, i: number, arr: TimelinePoint[]) => {
    if (i !== 0 && i !== Math.floor(arr.length / 2) && i !== arr.length - 1) return ""
    const date = new Date(d.date)
    return `${date.toLocaleString("default", { month: "short" })} ${date.getDate()}`
  }

  return (
    <div>
      {/* Header */}
      <header className="flex justify-between items-end mb-12">
        <div>
          <h1 className="font-hanken text-[32px] font-semibold leading-tight tracking-[-0.01em] text-on-surface">Emotional Insights</h1>
          <p className="text-base text-on-surface-variant mt-1">Deep dive into the lyrical sentiment of your library.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-surface-container border border-outline-variant rounded-lg px-4 py-1.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">calendar_today</span>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="bg-transparent font-geist text-[12px] tracking-wider uppercase text-on-surface-variant outline-none cursor-pointer"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 3 months</option>
            </select>
          </div>
        </div>
      </header>

      <div className="space-y-6">

        {/* Mood Timeline Card */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-hanken text-[20px] font-semibold text-on-surface">Mood Timeline</h2>
              <p className="font-geist text-[12px] tracking-wider uppercase text-on-surface-variant mt-1">
                Daily lyrical mood · based on lyrics, not musical sound
              </p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-container" />
                <span className="font-geist text-[12px] text-on-surface">Lyrical Valence</span>
              </div>
            </div>
          </div>
          <div className="h-[280px] w-full chart-grid rounded-lg relative overflow-hidden">
            {timelineData.length >= 2 ? (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="valenceGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#d2bbff" />
                    <stop offset="100%" stopColor="#d2bbff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={closedPath} fill="url(#valenceGradient)" opacity="0.15" />
                <path d={svgPath} fill="none" stroke="#d2bbff" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant text-sm">
                Sync tracks to see your mood timeline.
              </div>
            )}
            {/* X-axis labels */}
            {timelineData.length >= 2 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-between px-6 font-geist text-[11px] text-on-surface-variant/60">
                {[0, Math.floor((timelineData.length - 1) / 2), timelineData.length - 1].map(i => (
                  <span key={i}>{fmtAxisDate(timelineData[i], i, timelineData)}</span>
                ))}
              </div>
            )}
          </div>

          {/* Timeline summary stats */}
          {timelineData.length >= 2 && (() => {
            const avg  = timelineData.reduce((s, d) => s + d.valence, 0) / timelineData.length
            const peak = timelineData.reduce((a, b) => a.valence > b.valence ? a : b)
            const trough = timelineData.reduce((a, b) => a.valence < b.valence ? a : b)
            const fmt = (d: TimelinePoint) => {
              const date = new Date(d.date)
              return `${date.toLocaleString("default", { month: "short" })} ${date.getDate()}`
            }
            return (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-outline-variant/30">
                {[
                  { label: "Average mood",   value: moodLabel(avg).text,    color: moodLabel(avg).color,    sub: `across ${timelineData.length} days` },
                  { label: "Highest point",  value: moodLabel(peak.valence).text,   color: moodLabel(peak.valence).color,   sub: fmt(peak) },
                  { label: "Lowest point",   value: moodLabel(trough.valence).text, color: moodLabel(trough.valence).color, sub: fmt(trough) },
                ].map(({ label, value, color, sub }) => (
                  <div key={label}>
                    <p className="font-geist text-[10px] tracking-widest uppercase text-on-surface-variant">{label}</p>
                    <p className="font-hanken text-[16px] font-semibold mt-0.5" style={{ color }}>{value}</p>
                    <p className="font-geist text-[10px] text-on-surface-variant/50 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Mood Forecast */}
        <MoodForecast />

        {/* Time of Day + Day of Week */}
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-6 bg-surface-container border border-outline-variant rounded-xl p-6">
            <h2 className="font-hanken text-[20px] font-semibold text-on-surface mb-6">Time of Day</h2>
            <TimeOfDayCard data={hourData} />
          </section>
          <section className="col-span-12 lg:col-span-6 bg-surface-container border border-outline-variant rounded-xl p-6">
            <h2 className="font-hanken text-[20px] font-semibold text-on-surface mb-6">Day of Week</h2>
            <DayOfWeekCard data={dowData} />
          </section>
        </div>

      </div>
    </div>
  )
}
