"use client"
import { useEffect, useState } from "react"
import { getMe, getTimeline, getEmotions } from "@/lib/api"
import type { TimelinePoint, EmotionsResponse, UserInfo } from "@/types"
import { getMoodTheme } from "@/lib/mood-theme"

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

const EMOTION_COLORS: Record<string, string> = {
  anger:    "#ffb4ab",
  joy:      "#d2bbff",
  fear:     "#ffb784",
  sadness:  "#958da1",
  optimism: "#c7c5d0",
}

const MOOD_GRADIENTS: Record<string, string> = {
  anger:    "from-[#450a0a] via-[#991b1b] to-[#7c2d12]",
  joy:      "from-[#451a03] via-[#92400e] to-[#78350f]",
  sadness:  "from-[#1e1b4b] via-[#3730a3] to-[#4c1d95]",
  fear:     "from-[#1c1917] via-[#44403c] to-[#292524]",
  optimism: "from-[#052e16] via-[#166534] to-[#14532d]",
}

export default function OverviewPage() {
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

  const moodTheme    = getMoodTheme(emotions?.dominant_mood)
  const capitalize   = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const maxEmotion   = emotions?.distribution ? Math.max(...Object.values(emotions.distribution)) : 1
  const avgValence   = timeline.length ? timeline.reduce((s, d) => s + d.valence, 0) / timeline.length : null
  const dominantMood = emotions?.dominant_mood ?? "optimism"
  const heroGradient = MOOD_GRADIENTS[dominantMood] ?? MOOD_GRADIENTS.optimism

  function lyricalMoodLabel(v: number | null): string {
    if (v === null) return "—"
    const isHype = emotions?.top_genre === "hip-hop/rap" || emotions?.top_genre === "electronic"
    if (v < -0.5) return isHype ? "Intense"       : "Very dark"
    if (v < -0.2) return isHype ? "Hard-hitting"  : "Dark & heavy"
    if (v < -0.05) return isHype ? "Energetic"    : "Slightly heavy"
    if (v <  0.05) return "Mixed"
    if (v <  0.2)  return "Slightly uplifting"
    if (v <  0.5)  return "Uplifting"
    return "Very uplifting"
  }

  // Last 7 days of timeline for the bar chart
  const last7 = timeline.slice(-7)
  const maxV = last7.length ? Math.max(...last7.map(d => Math.abs(d.valence)), 0.1) : 0.1
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "TODAY"]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h2 className="font-hanken text-[32px] font-semibold leading-tight tracking-[-0.01em] text-on-surface">Overview</h2>
          <p className="text-base text-on-surface-variant mt-1">Your emotional sonic landscape for the past week.</p>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Hero Card — full width */}
        <section className={`col-span-12 relative overflow-hidden rounded-xl bg-gradient-to-br ${heroGradient} p-12 border border-white/[0.08] min-h-[320px] flex items-center`}>
          <div className="relative z-10 w-full flex flex-col lg:flex-row justify-between items-center gap-12">
            {/* Left */}
            <div className="flex-1 space-y-4">
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1 rounded-full border border-white/20 text-white font-geist text-[12px] tracking-widest uppercase">
                Current Vibe
              </span>
              <div>
                <h3 className="font-hanken text-white text-2xl font-semibold mb-1">
                  {greeting()}, {user?.spotify_id ?? "there"} 👋
                </h3>
                <p className="text-white/70 text-base">You&apos;ve been feeling</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-hanken text-white font-bold" style={{ fontSize: "48px", lineHeight: "1.1" }}>
                    {moodTheme.label}
                  </span>
                  <span className="text-4xl">{moodTheme.emoji}</span>
                </div>
              </div>
              <div className="flex gap-6 text-white/60">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">library_music</span>
                  <span className="font-geist text-[12px] tracking-wider uppercase">{emotions?.analyzed_tracks ?? 0} tracks analysed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  <span className="font-geist text-[12px] tracking-wider uppercase">{timeline.length} days of history</span>
                </div>
              </div>
            </div>

            {/* Emotion Mix Glass Panel */}
            <div className="w-full lg:w-[380px] glass-panel p-6 rounded-xl space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-geist text-[12px] tracking-widest uppercase text-white">Emotion Mix</h4>
                <span className="material-symbols-outlined text-white/40 text-[18px]">tune</span>
              </div>
              <div className="space-y-4">
                {emotions?.distribution
                  ? Object.entries(emotions.distribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([key, val]) => {
                        const pct = maxEmotion > 0 ? Math.round((val / maxEmotion) * 100) : 0
                        const color = EMOTION_COLORS[key] ?? "#d2bbff"
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between font-geist text-[10px] text-white/60 uppercase tracking-wider">
                              <span>{key}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
                              />
                            </div>
                          </div>
                        )
                      })
                  : <p className="text-white/40 text-sm">Sync tracks to see your emotion mix.</p>
                }
              </div>
            </div>
          </div>
        </section>

        {/* Stat Cards */}
        <div className="col-span-12 md:col-span-3">
          <div className="bg-surface-container-low border border-outline-variant p-6 rounded-xl h-full flex flex-col justify-between">
            <div>
              <p className="font-geist text-[12px] tracking-widest uppercase text-on-surface-variant mb-2">Top Emotion</p>
              <h4 className="font-hanken text-[20px] font-semibold text-primary">
                {emotions?.dominant_mood ? capitalize(emotions.dominant_mood) : "—"}
              </h4>
            </div>
            <p className="text-[14px] text-on-surface-variant/60 mt-4">in your lyrics</p>
          </div>
        </div>
        <div className="col-span-12 md:col-span-3">
          <div className="bg-surface-container-low border border-outline-variant p-6 rounded-xl h-full flex flex-col justify-between">
            <div>
              <p className="font-geist text-[12px] tracking-widest uppercase text-on-surface-variant mb-2">Tracks Analysed</p>
              <h4 className="font-hanken text-[20px] font-semibold text-on-surface">{emotions?.analyzed_tracks ?? "—"}</h4>
            </div>
            <p className="text-[14px] text-on-surface-variant/60 mt-4">with full lyrics</p>
          </div>
        </div>
        <div className="col-span-12 md:col-span-3">
          <div className="bg-surface-container-low border border-outline-variant p-6 rounded-xl h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <p className="font-geist text-[12px] tracking-widest uppercase text-on-surface-variant mb-2">Lyrical Mood</p>
                {avgValence !== null && (
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    {avgValence > 0.05 ? "trending_up" : avgValence < -0.05 ? "trending_down" : "trending_flat"}
                  </span>
                )}
              </div>
              <h4 className="font-hanken text-[20px] font-semibold text-on-surface">{lyricalMoodLabel(avgValence)}</h4>
            </div>
            <p className="text-[14px] text-on-surface-variant/60 mt-4">
              {emotions?.top_genre ? `${emotions.top_genre} · lyrics` : "from song lyrics"}
            </p>
          </div>
        </div>
        <div className="col-span-12 md:col-span-3">
          <div className="bg-surface-container-low border border-outline-variant p-6 rounded-xl h-full flex flex-col justify-between">
            <div>
              <p className="font-geist text-[12px] tracking-widest uppercase text-on-surface-variant mb-2">Days Tracked</p>
              <h4 className="font-hanken text-[20px] font-semibold text-on-surface">{timeline.length > 0 ? timeline.length : "—"}</h4>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[14px] text-on-surface-variant/60">keep syncing to grow</p>
            </div>
          </div>
        </div>

        {/* Weekly Trajectory Chart */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 h-full">
            <div className="flex justify-between items-center mb-12">
              <h4 className="font-hanken text-[20px] font-semibold text-on-surface">Weekly Emotional Trajectory</h4>
              <div className="flex gap-2">
                <span className="px-4 py-1 rounded-full bg-primary/10 border border-primary/20 font-geist text-[12px] tracking-wider uppercase text-primary">
                  Valence
                </span>
              </div>
            </div>
            <div className="relative h-[200px] w-full flex items-end justify-between gap-2">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                {[0,1,2,3].map(i => <div key={i} className="border-t border-on-surface w-full" />)}
              </div>
              {last7.length > 0
                ? last7.map((d, i) => {
                    const heightPct = Math.max(8, Math.round((Math.abs(d.valence) / maxV) * 90))
                    const isToday = i === last7.length - 1
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end h-full">
                        <div
                          className={`rounded-t-sm transition-all ${isToday ? "opacity-100 border-t-2 border-primary" : "opacity-70 hover:opacity-100"}`}
                          style={{
                            height: `${heightPct}%`,
                            background: d.valence >= 0
                              ? "linear-gradient(to top, rgba(210,187,255,0.4), rgba(210,187,255,0.05))"
                              : "linear-gradient(to top, rgba(255,180,171,0.4), rgba(255,180,171,0.05))",
                          }}
                        />
                      </div>
                    )
                  })
                : days.map((_, i) => {
                    const heights = [40, 65, 55, 90, 82, 95, 30]
                    const isToday = i === 6
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end h-full">
                        <div
                          className={`rounded-t-sm bg-gradient-to-t from-primary/40 to-primary/5 ${isToday ? "opacity-100 border-t-2 border-primary" : "opacity-70"}`}
                          style={{ height: `${heights[i]}%` }}
                        />
                      </div>
                    )
                  })
              }
            </div>
            <div className="flex justify-between mt-3 px-1">
              {(last7.length > 0
                ? last7.map((d, i) => {
                    const date = new Date(d.date)
                    const isToday = i === last7.length - 1
                    const dayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"]
                    return { label: isToday ? "TODAY" : dayNames[date.getDay()], isToday }
                  })
                : days.map((label, i) => ({ label, isToday: i === 6 }))
              ).map(({ label, isToday }, i) => (
                <span key={i} className={`font-geist text-[10px] tracking-wider ${isToday ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Lyrical Patterns Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 h-full flex flex-col">
            <h4 className="font-hanken text-[20px] font-semibold text-on-surface mb-6">Lyrical Patterns</h4>
            <div className="space-y-6 flex-1">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-error/10 text-error rounded-lg shrink-0">
                  <span className="material-symbols-outlined text-[20px]">format_quote</span>
                </div>
                <div>
                  <p className="text-[14px] text-on-surface italic">
                    &ldquo;{dominantMood === "anger" ? "I never fold, I'm building a legacy..." : dominantMood === "sadness" ? "Lost in the rain again..." : dominantMood === "joy" ? "Everything is golden today..." : "Reaching for something more..."}&rdquo;
                  </p>
                  <p className="font-geist text-[10px] text-on-surface-variant/60 mt-1 uppercase tracking-wider">
                    Detected: {capitalize(dominantMood)} · AI analysis
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </div>
                <div>
                  <p className="text-[14px] text-on-surface">
                    Dominant Motif: <strong>{emotions?.top_genre ? capitalize(emotions.top_genre) : "Searching"}</strong>
                  </p>
                  <p className="text-[14px] text-on-surface-variant mt-1">
                    {emotions?.analyzed_tracks
                      ? `${emotions.analyzed_tracks} tracks analysed across your listening history.`
                      : "Sync your tracks to reveal lyrical patterns."}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {}}
              className="w-full mt-6 py-2 border border-outline-variant rounded-lg font-geist text-[12px] tracking-wider uppercase text-on-surface-variant hover:bg-surface-variant transition-colors flex items-center justify-center gap-2"
            >
              View Insights
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
