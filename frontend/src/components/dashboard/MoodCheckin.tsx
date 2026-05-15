"use client"
import { useEffect, useState } from "react"
import { getTodayCheckin, submitCheckin } from "@/lib/api"

const MOODS = [
  { score: 1, emoji: "😞", label: "Very sad" },
  { score: 2, emoji: "🙁", label: "Sad" },
  { score: 3, emoji: "😐", label: "Neutral" },
  { score: 4, emoji: "🙂", label: "Happy" },
  { score: 5, emoji: "😄", label: "Very happy" },
]

export default function MoodCheckinCard() {
  const [todayMood, setTodayMood]   = useState<number | null>(null)
  const [countToday, setCountToday] = useState(0)
  const [hovered, setHovered]       = useState<number | null>(null)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    getTodayCheckin().then((r) => {
      setTodayMood(r.checkin)
      setCountToday(r.count_today ?? 0)
    }).catch(() => {})
  }, [])

  async function handleSelect(score: number) {
    setTodayMood(score); setSaving(true); setSaved(false)
    try {
      await submitCheckin(score)
      setSaved(true)
      setCountToday(c => c + 1)
    } catch { /* non-critical */ } finally { setSaving(false) }
  }

  const display = hovered ?? todayMood

  return (
    <section className="glass-panel rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 pointer-events-none select-none">
        <span className="material-symbols-outlined text-primary opacity-10" style={{ fontSize: "120px" }}>edit_square</span>
      </div>
      <div className="relative z-10">
        <span className="font-geist text-[12px] tracking-widest uppercase text-primary mb-2 block">Daily Log</span>
        <h3 className="font-hanken text-[28px] font-semibold text-on-surface mb-1">How are you feeling today?</h3>
        <p className="text-base text-on-surface-variant mb-6">Tap your mood — you can update it as many times as you like through the day.</p>

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

        <div className="mt-4 h-5 flex items-center justify-between">
          <div className="flex items-center">
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
          {countToday > 1 && (
            <span className="font-geist text-[10px] tracking-wider uppercase text-on-surface-variant/50">
              {countToday} check-ins today · averaged
            </span>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-outline-variant/30 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[20px]">lock_clock</span>
          <p className="text-[14px] text-on-surface-variant">Your mood vs music correlation will be revealed after the study period.</p>
        </div>
      </div>
    </section>
  )
}
