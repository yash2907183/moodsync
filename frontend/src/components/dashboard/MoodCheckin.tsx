"use client"
import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { getTodayCheckin, submitCheckin, getMoodCorrelation } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import type { CorrelationPoint } from "@/types"

const MOODS = [
  { score: 1, emoji: "😔", label: "Very sad" },
  { score: 2, emoji: "😕", label: "Sad" },
  { score: 3, emoji: "😐", label: "Neutral" },
  { score: 4, emoji: "🙂", label: "Happy" },
  { score: 5, emoji: "😄", label: "Very happy" },
]

function correlationLabel(r: number | null): string {
  if (r === null) return "Not enough data yet"
  if (r >= 0.7)  return "Strong match — your music mirrors how you feel"
  if (r >= 0.4)  return "Moderate match — some alignment"
  if (r >= 0.1)  return "Weak match — slight alignment"
  if (r >= -0.1) return "No correlation detected"
  if (r >= -0.4) return "Slight mismatch — music and mood diverge"
  return "Strong mismatch — you listen opposite to your mood"
}

export default function MoodCheckinCard() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [todayMood, setTodayMood] = useState<number | null>(null)
  const [hovered, setHovered]     = useState<number | null>(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [points, setPoints]       = useState<CorrelationPoint[]>([])
  const [correlation, setCorrelation] = useState<number | null>(null)
  const [loadingCorr, setLoadingCorr] = useState(true)

  useEffect(() => {
    getTodayCheckin().then((r) => setTodayMood(r.checkin)).catch(() => {})
    getMoodCorrelation(30)
      .then((r) => { setPoints(r.points); setCorrelation(r.correlation) })
      .catch(() => {})
      .finally(() => setLoadingCorr(false))
  }, [])

  async function handleSelect(score: number) {
    setTodayMood(score); setSaving(true); setSaved(false)
    try {
      await submitCheckin(score)
      setSaved(true)
      const r = await getMoodCorrelation(30)
      setPoints(r.points); setCorrelation(r.correlation)
    } catch { /* non-critical */ } finally { setSaving(false) }
  }

  const display = hovered ?? todayMood
  const chartData = points.map((p) => ({
    date: p.date.slice(5),
    "Your mood": parseFloat((((p.user_mood - 1) / 4)).toFixed(3)),
    "AI valence": p.ai_valence,
  }))

  const tooltipBg  = isDark ? "#111118" : "#ffffff"
  const tooltipBdr = isDark ? "#1e1e2a" : "#e2e8f0"
  const axisColor  = isDark ? "#44445a" : "#94a3b8"

  return (
    <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-lg mb-1 text-slate-900 dark:text-slate-100">How are you feeling today?</h2>
      <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">Rate your mood — we&apos;ll compare it against what your music says</p>

      <div className="flex gap-3 mb-2">
        {MOODS.map((m) => (
          <button
            key={m.score}
            onMouseEnter={() => setHovered(m.score)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleSelect(m.score)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-all duration-200 ${
              todayMood === m.score
                ? "border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/30 shadow-sm scale-105"
                : "border-slate-200 dark:border-[#2a2a38] hover:border-slate-300 dark:hover:border-[#3a3a4a] bg-slate-50 dark:bg-[#1a1a22] hover:bg-white dark:hover:bg-[#1f1f28] hover:scale-105"
            }`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="h-5 mb-6 text-sm text-center">
        {saving && <span className="text-slate-400">Saving…</span>}
        {saved && !saving && <span className="text-violet-600 dark:text-violet-400 font-medium">Saved ✓</span>}
        {display && !saving && !saved && <span className="text-slate-400">{MOODS[display - 1].label}</span>}
      </div>

      <div className="border-t border-slate-100 dark:border-[#1e1e2a] pt-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Mood vs Music (last 30 days)</h3>
          {correlation !== null && (
            <span className="text-xs font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-full">
              r = {correlation.toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{correlationLabel(correlation)}</p>

        {loadingCorr ? (
          <div className="h-[140px] flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : chartData.length < 2 ? (
          <div className="h-[140px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-600">
            Check in on at least 2 days to see the correlation chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 1]} tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, fontSize: 12 }}
                formatter={(v, name) => [typeof v === "number" ? v.toFixed(2) : v, name]}
              />
              <ReferenceLine y={0.5} stroke={isDark ? "#2a2a38" : "#f1f5f9"} strokeDasharray="3 3" />
              <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
              <Line type="monotone" dataKey="Your mood"  stroke="#7c3aed" strokeWidth={2} dot={{ r: 3, fill: "#7c3aed" }} />
              <Line type="monotone" dataKey="AI valence" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
