"use client"
import { useEffect, useState } from "react"
import { getTopTracks, getArtistMood } from "@/lib/api"
import TopTracksList from "@/components/dashboard/TopTracksList"
import EmotionBreakdown from "@/components/charts/EmotionBreakdown"
import { getEmotions } from "@/lib/api"
import type { EmotionsResponse } from "@/types"

function moodLabel(v: number) {
  if (v > 0.3) return { text: "Uplifting", color: "#10b981" }
  if (v > -0.1) return { text: "Neutral", color: "#7c3aed" }
  return { text: "Heavy", color: "#f87171" }
}

export default function TracksPage() {
  const [topTracks, setTopTracks] = useState<{ track_id: string; name: string; artist: string[]; plays: number }[]>([])
  const [artistMood, setArtistMood] = useState<{ artist: string; avg_valence: number; plays: number }[]>([])
  const [emotions, setEmotions] = useState<EmotionsResponse | null>(null)

  useEffect(() => {
    getTopTracks(15).then(r => setTopTracks(r.tracks)).catch(() => {})
    getArtistMood().then(setArtistMood).catch(() => {})
    getEmotions(50).then(r => { if (r) setEmotions(r) }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tracks</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your most played songs and their lyrical mood</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top tracks */}
        <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Most Played</h2>
          <p className="text-xs text-slate-400 mb-4">Your top tracks by play count</p>
          <TopTracksList tracks={topTracks} />
        </div>

        {/* Emotion breakdown */}
        <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Emotion Breakdown</h2>
          <p className="text-xs text-slate-400 mb-1">What your lyrics express</p>
          <p className="text-[10px] text-slate-300 dark:text-slate-600 mb-4">Based on lyrical content — not the sound of the music</p>
          <EmotionBreakdown data={emotions?.distribution ?? null} />
        </div>
      </div>

      {/* Artist mood mapping */}
      <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Artist Mood Map</h2>
        <p className="text-xs text-slate-400 mb-5">Which artists you reach for when lyrics go heavy vs uplifting · artists with 3+ listens</p>
        {artistMood.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Not enough listens per artist yet — keep syncing</p>
        ) : (
          <div className="space-y-2.5">
            {artistMood.map((a) => {
              const mood = moodLabel(a.avg_valence)
              const pct  = Math.round(((a.avg_valence + 1) / 2) * 100)
              return (
                <div key={a.artist} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{a.artist}</p>
                    <p className="text-[10px] text-slate-400">{a.plays} plays</p>
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-[#1e1e2a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: mood.color }} />
                  </div>
                  <span className="text-xs w-16 text-right shrink-0" style={{ color: mood.color }}>{mood.text}</span>
                  <span className="text-[10px] text-slate-400 w-10 text-right tabular-nums shrink-0">{a.avg_valence.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
