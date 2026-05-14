"use client"
import { useEffect, useState } from "react"
import { getTopTracks, getArtistMood, getEmotions } from "@/lib/api"
import type { EmotionsResponse } from "@/types"

const EMOTION_COLORS: Record<string, string> = {
  joy:      "#f59e0b",
  optimism: "#10b981",
  sadness:  "#6366f1",
  fear:     "#64748b",
  anger:    "#ef4444",
}

function valenceMoodLabel(v: number): { text: string; color: string; bg: string; border: string } {
  if (v > 0.3)  return { text: "Uplifting", color: "#22c55e", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.2)"  }
  if (v > -0.1) return { text: "Neutral",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" }
  return              { text: "Heavy",     color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.2)"  }
}

export default function TracksPage() {
  const [topTracks, setTopTracks] = useState<{ track_id: string; name: string; artist: string[]; plays: number }[]>([])
  const [artistMood, setArtistMood] = useState<{ artist: string; avg_valence: number; plays: number }[]>([])
  const [emotions, setEmotions]   = useState<EmotionsResponse | null>(null)

  useEffect(() => {
    getTopTracks(15).then(r => setTopTracks(r.tracks)).catch(() => {})
    getArtistMood().then(setArtistMood).catch(() => {})
    getEmotions(50).then(r => { if (r) setEmotions(r) }).catch(() => {})
  }, [])

  const maxPlays = topTracks.length ? Math.max(...topTracks.map(t => t.plays)) : 1
  const distribution = (emotions?.distribution ?? {}) as Record<string, number>
  const maxEmotion   = Object.values(distribution).length ? Math.max(...(Object.values(distribution) as number[])) : 1

  return (
    <div>
      {/* Header */}
      <header className="mb-6 md:mb-12">
        <h1 className="font-hanken text-[24px] md:text-[32px] font-semibold leading-tight tracking-[-0.01em] text-on-surface">Music Analytics</h1>
        <p className="text-sm md:text-base text-on-surface-variant mt-1">Deep dive into your emotional listening patterns and track performance.</p>
      </header>

      {/* Top Grid: Most Played + Emotion Breakdown */}
      <div className="grid grid-cols-12 gap-6 mb-6">

        {/* Most Played */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-hanken text-[20px] font-semibold text-on-surface">Most Played</h2>
            <span className="font-geist text-[12px] tracking-wider uppercase text-on-surface-variant">Last 30 days</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
            {topTracks.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-8">Sync your Spotify to see top tracks.</p>
            ) : topTracks.map((track, i) => {
              const pct = Math.round((track.plays / maxPlays) * 100)
              return (
                <div key={track.track_id} className="flex items-center gap-4 p-2 hover:bg-surface-variant rounded-lg transition-colors">
                  <span className="font-geist text-[11px] text-outline w-6 shrink-0 text-right">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end mb-1">
                      <div className="min-w-0">
                        <p className="font-bold text-[15px] text-on-surface leading-tight truncate">{track.name}</p>
                        <p className="text-[13px] text-on-surface-variant truncate">{track.artist.join(", ")}</p>
                      </div>
                      <span className="font-geist text-[12px] text-primary shrink-0 ml-3">{track.plays} plays</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Emotion Breakdown */}
        <div className="col-span-12 lg:col-span-5 bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-6">
          <div>
            <h2 className="font-hanken text-[20px] font-semibold text-on-surface">Emotion Breakdown</h2>
            <p className="font-geist text-[12px] tracking-wider uppercase text-on-surface-variant mt-1">
              Distribution across {emotions?.analyzed_tracks ?? 0} tracks
            </p>
          </div>
          <div className="flex flex-col gap-5 flex-1 justify-center">
            {Object.entries(EMOTION_COLORS)
              .sort(([a], [b]) => (distribution[b] ?? 0) - (distribution[a] ?? 0))
              .map(([emotion, color]) => {
              const raw = distribution[emotion] ?? 0
              const pct = maxEmotion > 0 ? Math.round((raw / maxEmotion) * 100) : 0
              return (
                <div key={emotion} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-geist text-[12px] tracking-wider uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {emotion}
                    </span>
                    <span className="font-geist text-[12px] text-on-surface">{pct}%</span>
                  </div>
                  <div className="w-full h-3 bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(distribution).length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-4">Sync tracks to see emotion distribution.</p>
            )}
          </div>
        </div>
      </div>

      {/* Artist Mood Map */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-hanken text-[20px] font-semibold text-on-surface">Artist Mood Map</h2>
            <p className="font-geist text-[12px] tracking-wider uppercase text-on-surface-variant mt-1">
              Aggregated valence of artists with 3+ listens
            </p>
          </div>
          <div className="bg-surface-container-high rounded-full px-4 py-1.5 border border-outline-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">filter_list</span>
            <span className="font-geist text-[12px] tracking-wider uppercase">Valence Sorted</span>
          </div>
        </div>

        {artistMood.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
            <span className="material-symbols-outlined text-[48px]">analytics</span>
            <p className="text-[16px] text-center">Not enough listens per artist yet — keep syncing.</p>
          </div>
        ) : (
          <div className="flex flex-col border-t border-outline-variant">
            {[...artistMood].sort((a, b) => b.avg_valence - a.avg_valence).map(a => {
              const mood = valenceMoodLabel(a.avg_valence)
              const pct  = Math.round(((a.avg_valence + 1) / 2) * 100)
              return (
                <div key={a.artist} className="grid grid-cols-12 items-center py-4 border-b border-outline-variant hover:bg-surface-variant/30 transition-colors px-2">
                  <div className="col-span-3 flex flex-col">
                    <span className="font-bold text-[15px] text-on-surface truncate">{a.artist}</span>
                    <span className="font-geist text-[11px] text-outline">{a.plays} listens</span>
                  </div>
                  <div className="col-span-6 flex items-center gap-4 px-6">
                    <div className="flex-1 h-1.5 rounded-full relative" style={{
                      background: "linear-gradient(to right, #ef4444, #f59e0b, #22c55e)"
                    }}>
                      <div
                        className="absolute w-4 h-4 rounded-full border-2 border-white bg-on-surface top-1/2 -translate-y-1/2 shadow-lg"
                        style={{ left: `calc(${pct}% - 8px)` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span
                      className="px-3 py-1 rounded-full font-geist text-[11px] tracking-wider uppercase border"
                      style={{ color: mood.color, backgroundColor: mood.bg, borderColor: mood.border }}
                    >
                      {mood.text}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="font-geist text-[12px] text-on-surface">{a.avg_valence.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Footer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "trending_up",  label: "Avg BPM",       value: emotions?.analyzed_tracks ? "—" : "—",  color: "text-primary",   bg: "bg-primary/10"   },
          { icon: "speed",        label: "Danceability",  value: "—",                                      color: "text-tertiary",  bg: "bg-tertiary/10"  },
          { icon: "waves",        label: "Acousticness",  value: "—",                                      color: "text-error",     bg: "bg-error/10"     },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined ${color}`}>{icon}</span>
            </div>
            <div>
              <p className="font-geist text-[12px] tracking-wider uppercase text-on-surface-variant">{label}</p>
              <p className="font-hanken text-[20px] font-semibold text-on-surface">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
