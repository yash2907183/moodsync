"use client"
import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { getTodayCheckin, submitCheckin, getMoodCorrelation } from "@/lib/api"
import type { CorrelationPoint } from "@/types"

const MOODS = [
  { score: 1, emoji: "😞", label: "Very sad" },
  { score: 2, emoji: "🙁", label: "Sad" },
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

  const axisColor = "#4a4455"

  return (
    <div className="space-y-6">

      {/* Daily Check-in */}
      <section className="glass-panel rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 pointer-events-none select-none">
          <span className="material-symbols-outlined text-primary opacity-10" style={{ fontSize: "120px" }}>edit_square</span>
        </div>
        <div className="relative z-10">
          <span className="font-geist text-[12px] tracking-widest uppercase text-primary mb-2 block">Daily Log</span>
          <h3 className="font-hanken text-[28px] font-semibold text-on-surface mb-1">How are you feeling today?</h3>
          <p className="text-base text-on-surface-variant mb-6">Rate your mood — we&apos;ll compare it against what your music says.</p>

          <div className="flex flex-wrap items-center gap-4 py-2">
            {MOODS.map((m) => (
              <button
                key={m.score}
                onMouseEnter={() => setHovered(m.score)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleSelect(m.score)}
                className={`flex flex-col items-center gap-2 transition-all duration-200 ${todayMood === m.score ? "scale-105" : "group"}`}
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all ${
                  todayMood === m.score
                    ? "bg-primary-container border-2 border-primary shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                    : "bg-surface-container border border-outline-variant group-hover:border-primary/50"
                }`}>
                  <span className="text-4xl">{m.emoji}</span>
                </div>
                <span className={`font-geist text-[12px] tracking-wider uppercase ${todayMood === m.score ? "text-primary font-bold" : "text-on-surface-variant group-hover:text-primary"}`}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 h-5 flex items-center">
            {saving && <span className="text-on-surface-variant text-sm">Saving…</span>}
            {saved && !saving && (
              <span className="flex items-center gap-2 font-geist text-[12px] tracking-wider text-primary">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Saved ✓
              </span>
            )}
            {display && !saving && !saved && (
              <span className="text-on-surface-variant text-sm">{MOODS[display - 1].label}</span>
            )}
          </div>
        </div>
      </section>

      {/* Mood vs Music Chart */}
      <section className="glass-panel rounded-xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-hanken text-[20px] font-semibold text-on-surface">Mood vs Music (last 30 days)</h3>
            <p className="text-[14px] text-on-surface-variant mt-1">Synchronicity between listening habits and self-reported states.</p>
          </div>
          {correlation !== null && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                <span className="font-geist text-[12px] text-green-400 font-bold">r = {correlation.toFixed(2)}</span>
                <span className="material-symbols-outlined text-[16px] text-green-400">trending_up</span>
              </div>
              <span className="font-geist text-[10px] tracking-wider uppercase text-on-surface-variant mt-1">
                {correlationLabel(correlation)}
              </span>
            </div>
          )}
        </div>

        {loadingCorr ? (
          <div className="h-[260px] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : chartData.length < 2 ? (
          <div className="h-[260px] flex items-center justify-center text-on-surface-variant text-sm">
            Check in on at least 2 days to see the correlation chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 1]} tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e1e2b", border: "1px solid #4a4455", borderRadius: 10, fontSize: 12 }}
                formatter={(v, name) => [typeof v === "number" ? v.toFixed(2) : v, name]}
              />
              <ReferenceLine y={0.5} stroke="#4a4455" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="Your mood"  stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, fill: "#7c3aed" }} />
              <Line type="monotone" dataKey="AI valence" stroke="#ffb784" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3, fill: "#ffb784" }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-outline-variant/30 pt-4 mt-4">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary-container" />
              <span className="font-geist text-[11px] tracking-wider uppercase text-on-surface-variant">AI Valence</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tertiary" />
              <span className="font-geist text-[11px] tracking-wider uppercase text-on-surface-variant">Self-Reported</span>
            </div>
          </div>
          {correlation !== null && (
            <div className="flex items-center gap-3 p-3 bg-surface-container rounded-lg border border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
              <p className="text-[14px] text-on-surface">
                <span className="font-bold text-primary">Interpretation: </span>
                {correlationLabel(correlation)}.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="material-symbols-outlined text-tertiary text-[24px]">psychology</span>
            <h4 className="font-hanken text-[20px] font-semibold text-on-surface">Cognitive Ease</h4>
            <p className="text-[14px] text-on-surface-variant">You tend to report higher mood scores when listening to uptempo tracks with high harmonic complexity.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-outline-variant/30">
            <button className="text-primary font-geist text-[12px] tracking-wider uppercase flex items-center gap-1 hover:underline">
              View deeper insights
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="material-symbols-outlined text-error text-[24px]">emergency_home</span>
            <h4 className="font-hanken text-[20px] font-semibold text-on-surface">Stress Lag</h4>
            <p className="text-[14px] text-on-surface-variant">Your music choice often shifts to low valence 2 days before you report feeling neutral or sad.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-outline-variant/30">
            <button className="text-primary font-geist text-[12px] tracking-wider uppercase flex items-center gap-1 hover:underline">
              Predict next cycle
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
