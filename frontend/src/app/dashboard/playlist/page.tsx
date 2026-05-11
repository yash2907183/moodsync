"use client"
import PlaylistAnalyzer from "@/components/dashboard/PlaylistAnalyzer"

export default function PlaylistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Playlist</h1>
        <p className="text-sm text-slate-400 mt-0.5">Analyse any Spotify playlist and generate music from its mood</p>
      </div>
      <PlaylistAnalyzer />
    </div>
  )
}
