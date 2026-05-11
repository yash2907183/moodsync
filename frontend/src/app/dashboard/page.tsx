"use client"
import { useEffect, useState } from "react"
import { getMe, getTimeline, getEmotions } from "@/lib/api"
import type { TimelinePoint, EmotionsResponse, UserInfo } from "@/types"
import { getMoodTheme } from "@/lib/mood-theme"
import { useTheme } from "@/lib/theme"
import StatCard from "@/components/ui/StatCard"
import MoodSummary from "@/components/dashboard/MoodSummary"

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export default function OverviewPage() {
  useTheme()
  const [user, setUser]         = useState<UserInfo | null>(null)
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [emotions, setEmotions] = useState<EmotionsResponse | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.allSettled([getMe(), getTimeline(365), getEmotions(50)]).then(([u, t, e]) => {
      if (u.status === "fulfilled") setUser(u.value)
      if (t.status === "fulfilled") setTimeline(t.value)
      if (e.status === "fulfilled" && e.value) setEmotions(e.value)
      setLoading(false)
    })
  }, [])

  const avgValence    = timeline.length ? timeline.reduce((s, d) => s + d.valence, 0) / timeline.length : null
  const moodTheme     = getMoodTheme(emotions?.dominant_mood)
  const capitalize    = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const maxEmotion    = emotions?.distribution ? Math.max(...Object.values(emotions.distribution)) : 1

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Overview</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your listening mood at a glance</p>
      </div>

      {/* Mood hero */}
      {emotions ? (
        <div className={`relative bg-gradient-to-br ${moodTheme.gradient} rounded-2xl p-7 overflow-hidden`}>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8 pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-white/70 text-sm font-medium mb-3">{greeting()}, {user?.spotify_id ?? "there"} 👋</p>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-5xl drop-shadow">{moodTheme.emoji}</span>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-widest mb-0.5">You&apos;ve been feeling</p>
                  <h2 className="text-3xl font-bold text-white leading-none">{moodTheme.label}</h2>
                </div>
              </div>
              <p className="text-white/50 text-sm">{emotions.analyzed_tracks} tracks analysed · {timeline.length} days of history</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[160px]">
              <p className="text-white/50 text-[10px] uppercase tracking-widest mb-2.5">Emotion mix</p>
              <div className="space-y-2">
                {Object.entries(emotions.distribution).sort(([, a], [, b]) => b - a).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-white/60 text-xs w-14 capitalize">{key}</span>
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white/70 rounded-full" style={{ width: `${(val / maxEmotion) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl px-6 py-5">
          <p className="font-semibold text-amber-800 dark:text-amber-300">No mood data yet</p>
          <p className="text-sm text-amber-600 dark:text-amber-400/70 mt-1">Sync your Spotify history to get started. Analysis runs automatically.</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Top Emotion" value={emotions?.dominant_mood ? capitalize(emotions.dominant_mood) : "—"} sub="in your lyrics" accentColor={moodTheme.accent} />
        <StatCard label="Tracks Analysed" value={emotions?.analyzed_tracks ?? "—"} sub="with full lyrics" accentColor={moodTheme.accent} />
        <StatCard
          label="Lyrical Mood"
          value={avgValence !== null
            ? avgValence < -0.5 ? "Very dark"
            : avgValence < -0.2 ? "Dark & heavy"
            : avgValence < -0.05 ? "Slightly heavy"
            : avgValence < 0.05 ? "Mixed"
            : avgValence < 0.2 ? "Slightly uplifting"
            : avgValence < 0.5 ? "Uplifting"
            : "Very uplifting"
            : "—"}
          sub="from song lyrics"
          accentColor={avgValence !== null && avgValence > 0.05 ? "#10b981" : avgValence !== null && avgValence < -0.05 ? "#f87171" : "#94a3b8"}
        />
        <StatCard label="Days Tracked" value={timeline.length > 0 ? timeline.length : "—"} sub="keep syncing to grow" accentColor="#f59e0b" />
      </div>

      {/* AI Mood Summary */}
      <MoodSummary />
    </div>
  )
}
