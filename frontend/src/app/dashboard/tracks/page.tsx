"use client"
import { useEffect, useState } from "react"
import { getTopTracks, getEmotions } from "@/lib/api"
import type { EmotionsResponse } from "@/types"

const EMOTION_COLORS: Record<string, string> = {
  joy:      "#f59e0b",
  optimism: "#10b981",
  sadness:  "#6366f1",
  fear:     "#64748b",
  anger:    "#ef4444",
}

export default function TracksPage() {
  const [topTracks, setTopTracks] = useState<{ track_id: string; name: string; artist: string[]; plays: number }[]>([])
  const [emotions, setEmotions]   = useState<EmotionsResponse | null>(null)

  useEffect(() => {
    getTopTracks(15).then(r => setTopTracks(r.tracks)).catch(() => {})
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

    </div>
  )
}
