"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getJwt } from "@/lib/auth"
import { getMe, getEmotions, getTopTracks, getMoodSummary } from "@/lib/api"
import type { EmotionsResponse, UserInfo } from "@/types"

const MOOD_EMOJI: Record<string, string> = {
  joy: "✨", sadness: "🌧", anger: "🔥", fear: "🌑", optimism: "🌤",
}
const MOOD_GRADIENT: Record<string, string> = {
  joy:      "from-amber-500 via-orange-500 to-rose-500",
  sadness:  "from-indigo-600 via-blue-600 to-violet-700",
  anger:    "from-red-600 via-rose-600 to-pink-600",
  fear:     "from-slate-700 via-slate-800 to-slate-900",
  optimism: "from-emerald-500 via-teal-500 to-cyan-500",
}
const EMOTION_BAR_COLOR: Record<string, string> = {
  joy: "#fbbf24", sadness: "#818cf8", anger: "#f87171", fear: "#a78bfa", optimism: "#34d399",
}

interface TopTrack { track_id: string; name: string; artist: string | string[]; plays: number }

export default function SharePage() {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)
  const [user, setUser]       = useState<UserInfo | null>(null)
  const [emotions, setEmotions] = useState<EmotionsResponse | null>(null)
  const [topTracks, setTopTracks] = useState<TopTrack[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!getJwt()) { router.replace("/"); return }
    Promise.allSettled([
      getMe(),
      getEmotions(50),
      getTopTracks(3),
      getMoodSummary(30),
    ]).then(([u, e, t, s]) => {
      if (u.status === "fulfilled") setUser(u.value)
      if (e.status === "fulfilled") setEmotions(e.value)
      if (t.status === "fulfilled") setTopTracks(t.value.tracks)
      if (s.status === "fulfilled") setSummary(s.value.summary)
    }).finally(() => setLoading(false))
  }, [router])

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      })
      const link = document.createElement("a")
      link.download = "moodsync-card.png"
      link.href = canvas.toDataURL("image/png")
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  const mood = emotions?.dominant_mood ?? "joy"
  const gradient = MOOD_GRADIENT[mood] ?? MOOD_GRADIENT.joy
  const emoji = MOOD_EMOJI[mood] ?? "🎵"
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const dist = emotions?.distribution
  const maxEmotion = dist ? Math.max(...Object.values(dist)) : 1

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf8f4] flex flex-col items-center justify-center px-4 py-10">
      {/* Back */}
      <div className="w-full max-w-sm mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          {downloading ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {downloading ? "Saving..." : "Download"}
        </button>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className={`w-full max-w-sm rounded-3xl bg-gradient-to-br ${gradient} p-7 shadow-2xl select-none`}
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm">🎵</div>
            <span className="text-white/90 font-semibold text-sm tracking-tight">MoodSync</span>
          </div>
          {user?.spotify_id && (
            <span className="text-white/60 text-xs">@{user.spotify_id}</span>
          )}
        </div>

        {/* Mood hero */}
        <div className="mb-8">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Your dominant mood</p>
          <div className="flex items-center gap-3">
            <span className="text-5xl">{emoji}</span>
            <span className="text-4xl font-bold text-white tracking-tight">
              {capitalize(mood)}
            </span>
          </div>
        </div>

        {/* Emotion bars */}
        {dist && (
          <div className="mb-8 space-y-2">
            {Object.entries(dist)
              .sort(([, a], [, b]) => b - a)
              .map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-white/60 text-xs w-14">{capitalize(key)}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(val / maxEmotion) * 100}%`,
                        backgroundColor: EMOTION_BAR_COLOR[key] ?? "#fff",
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Top tracks */}
        {topTracks.length > 0 && (
          <div className="mb-8">
            <p className="text-white/60 text-xs uppercase tracking-widest mb-3">Most played</p>
            <div className="space-y-2.5">
              {topTracks.map((t, i) => (
                <div key={t.track_id} className="flex items-center gap-3">
                  <span className="text-white/30 text-xs font-mono w-4">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{t.name}</p>
                    <p className="text-white/50 text-xs truncate">
                      {Array.isArray(t.artist) ? t.artist.join(", ") : t.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI summary */}
        {summary && (
          <div className="mb-6 bg-white/10 rounded-2xl px-4 py-3">
            <p className="text-white/80 text-xs leading-relaxed line-clamp-3">{summary}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-[10px]">moodsync.app</span>
          <span className="text-white/40 text-[10px]">
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-400">Screenshot or hit Download to save as PNG</p>
    </div>
  )
}
