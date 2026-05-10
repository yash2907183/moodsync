"use client"
import { useEffect, useRef, useState } from "react"
import { startPlaylistAnalysis, getPlaylistJob, generatePlaylistMusic } from "@/lib/api"
import { getSpotifyToken } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import type { PlaylistJobResult, PlaylistTrack } from "@/lib/api"

function moodLabel(v: number): { text: string; color: string } {
  if (v >= 0.65) return { text: "Uplifting",   color: "#10b981" }
  if (v >= 0.45) return { text: "Balanced",    color: "#7c3aed" }
  if (v >= 0.25) return { text: "Melancholic", color: "#f59e0b" }
  return              { text: "Heavy",         color: "#f87171" }
}

function ValenceBar({ value }: { value: number }) {
  const pct = Math.round(((value + 1) / 2) * 100)
  const color = value >= 0.45 ? "#10b981" : value >= 0.25 ? "#f59e0b" : "#f87171"
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-[#1e1e2a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-slate-400 tabular-nums w-8 text-right">{value.toFixed(2)}</span>
    </div>
  )
}

export default function PlaylistAnalyzer() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [url, setUrl]             = useState("")
  const [job, setJob]             = useState<PlaylistJobResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [musicPrompt, setMusicPrompt] = useState<string | null>(null)
  const [audioB64, setAudioB64]   = useState<string | null>(null)
  const [musicError, setMusicError] = useState<string | null>(null)
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => clearPoll(), [])

  async function handleGenerateMusic() {
    if (!job?.job_id) return
    setGenerating(true)
    setMusicError(null)
    setMusicPrompt(null)
    setAudioB64(null)
    try {
      const res = await generatePlaylistMusic(job.job_id)
      setMusicPrompt(res.prompt)
      setAudioB64(res.audio_b64)
    } catch (err: unknown) {
      setMusicError(err instanceof Error ? err.message : "Music generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setJob(null)
    clearPoll()

    const token = getSpotifyToken()
    if (!token) { setError("Spotify session expired — please log in again."); return }
    if (!url.includes("spotify.com/playlist/") && !url.includes("spotify:playlist:")) {
      setError("Paste a Spotify playlist URL (open.spotify.com/playlist/…).")
      return
    }

    setSubmitting(true)
    try {
      const res = await startPlaylistAnalysis(url.trim(), token)

      pollRef.current = setInterval(async () => {
        try {
          const status = await getPlaylistJob(res.job_id)
          setJob(status)
          if (status.status === "done" || status.status === "error") clearPoll()
        } catch { /* keep polling */ }
      }, 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start analysis.")
    } finally {
      setSubmitting(false)
    }
  }

  const tracks: PlaylistTrack[] = job?.result?.tracks ?? []
  const scored = tracks.filter(t => t.valence !== null)
  const avgValence = job?.result?.avg_valence ?? null
  const mood = avgValence !== null ? moodLabel(avgValence) : null
  const pct = (job && job.total_tracks > 0)
    ? Math.round((job.analyzed_tracks / job.total_tracks) * 100) : 0

  return (
    <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Playlist Analyser</h2>
      <p className="text-sm text-slate-400 mt-0.5 mb-5">Paste a Spotify playlist URL to get its mood profile</p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://open.spotify.com/playlist/…"
          className="flex-1 text-sm rounded-xl border border-slate-200 dark:border-[#1e1e2a] bg-slate-50 dark:bg-[#1a1a22] text-slate-800 dark:text-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500/40 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={submitting || (job?.status === "running") || (job?.status === "pending")}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {submitting ? "Starting…" : "Analyse"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Running state */}
      {job && (job.status === "pending" || job.status === "running") && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{job.playlist_name ?? "Loading playlist…"}</span>
            <span>{job.analyzed_tracks} / {job.total_tracks} tracks</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-[#1e1e2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 animate-pulse">
            Fetching lyrics and analysing sentiment — this takes a minute for large playlists…
          </p>
        </div>
      )}

      {/* Error state */}
      {job?.status === "error" && (
        <p className="mt-4 text-sm text-red-500 dark:text-red-400">
          {job.error ?? "Analysis failed. Try again."}
        </p>
      )}

      {/* Done state */}
      {job?.status === "done" && job.result && (
        <div className="mt-5 space-y-5">
          {/* Summary pills */}
          <div className="flex flex-wrap gap-3">
            {mood && (
              <div
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 border text-xs font-medium"
                style={{ color: mood.color, borderColor: `${mood.color}40`, background: isDark ? `${mood.color}15` : `${mood.color}12` }}
              >
                Overall vibe: {mood.text}
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 border text-xs font-medium text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#1e1e2a]">
              {scored.length} / {tracks.length} tracks analysed
            </div>
            {avgValence !== null && (
              <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 border text-xs font-medium text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-950/20">
                Avg mood score: {avgValence.toFixed(2)}
              </div>
            )}
          </div>

          {/* Track list */}
          {tracks.length > 0 && (
            <div className="border border-slate-100 dark:border-[#1e1e2a] rounded-xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1e1e2a]">
                {tracks.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-[10px] text-slate-300 dark:text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{t.artist}</p>
                    </div>
                    <div className="w-28 shrink-0">
                      {t.valence !== null
                        ? <ValenceBar value={t.valence} />
                        : <span className="text-[10px] text-slate-300 dark:text-slate-600">no lyrics</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Similar Music */}
          <div className="border-t border-slate-100 dark:border-[#1e1e2a] pt-4">
            <button
              onClick={handleGenerateMusic}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {generating ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
              ) : (
                <><span>🎵</span> Generate Similar Music</>
              )}
            </button>
            {generating && (
              <p className="text-xs text-slate-400 mt-2 animate-pulse">Claude is writing a music prompt · Stability AI is generating audio (~30s)…</p>
            )}
            {musicError && (
              <p className="mt-3 text-sm text-red-500 dark:text-red-400">{musicError}</p>
            )}
            {audioB64 && musicPrompt && (
              <div className="mt-4 space-y-3">
                <div className="bg-slate-50 dark:bg-[#1a1a22] rounded-xl px-4 py-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Generated prompt</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{musicPrompt}</p>
                </div>
                <audio
                  controls
                  className="w-full h-10 rounded-xl"
                  src={`data:audio/mp3;base64,${audioB64}`}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
