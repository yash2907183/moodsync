"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getJwt, getSpotifyToken, isSpotifyTokenExpired, clearTokens } from "@/lib/auth"
import { getMe, getTimeline, getEmotions, syncTracks, getTopTracks, getAnalysisStatus } from "@/lib/api"
import type { TimelinePoint, EmotionsResponse, UserInfo } from "@/types"
import { getMoodTheme } from "@/lib/mood-theme"
import { useTheme } from "@/lib/theme"
import StatCard from "@/components/ui/StatCard"
import MoodTimeline from "@/components/charts/MoodTimeline"
import EmotionBreakdown from "@/components/charts/EmotionBreakdown"
import TopTracksList from "@/components/dashboard/TopTracksList"
import MoodSummary from "@/components/dashboard/MoodSummary"
import MoodCheckinCard from "@/components/dashboard/MoodCheckin"
import MoodForecast from "@/components/dashboard/MoodForecast"
import PlaylistAnalyzer from "@/components/dashboard/PlaylistAnalyzer"

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-[#2a2a38] bg-white dark:bg-[#111118] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shadow-sm"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx={12} cy={12} r={5} />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser]         = useState<UserInfo | null>(null)
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [emotions, setEmotions] = useState<EmotionsResponse | null>(null)
  const [topTracks, setTopTracks] = useState<{ track_id: string; name: string; artist: string[]; plays: number }[]>([])
  const [loading, setLoading]         = useState(true)
  const [syncing, setSyncing]         = useState(false)
  const [syncMsg, setSyncMsg]         = useState<string | null>(null)
  const [syncErr, setSyncErr]         = useState<string | null>(null)
  const [pendingAnalysis, setPending] = useState(0)
  const analysisPollRef               = useRef<ReturnType<typeof setInterval> | null>(null)
  const [days, setDays]               = useState(365)

  const loadData = useCallback(async () => {
    const [userRes, timelineRes, emotionsRes] = await Promise.allSettled([
      getMe(), getTimeline(days), getEmotions(50),
    ])
    if (userRes.status === "fulfilled")     setUser(userRes.value)
    if (timelineRes.status === "fulfilled") setTimeline(timelineRes.value)
    if (emotionsRes.status === "fulfilled" && emotionsRes.value) setEmotions(emotionsRes.value)
    try { const top = await getTopTracks(10); setTopTracks(top.tracks) } catch { /* non-critical */ }
    setLoading(false)
  }, [days])

  useEffect(() => {
    if (!getJwt()) { router.replace("/"); return }
    loadData()
  }, [loadData, router])

  function startAnalysisPoll() {
    if (analysisPollRef.current) clearInterval(analysisPollRef.current)
    analysisPollRef.current = setInterval(async () => {
      try {
        const { pending } = await getAnalysisStatus()
        setPending(pending)
        if (pending === 0) {
          clearInterval(analysisPollRef.current!)
          analysisPollRef.current = null
          await loadData()
        }
      } catch { /* ignore */ }
    }, 5000)
  }

  async function handleSync() {
    const spotifyToken = getSpotifyToken()
    if (!spotifyToken || isSpotifyTokenExpired()) { setSyncErr("Spotify session expired. Please log in again."); return }
    setSyncing(true); setSyncErr(null); setSyncMsg(null)
    try {
      const res = await syncTracks(spotifyToken)
      setSyncMsg(`Synced ${res.count} tracks!`)
      await loadData()
      const { pending } = await getAnalysisStatus()
      setPending(pending)
      if (pending > 0) startAnalysisPoll()
    } catch { setSyncErr("Sync failed. Try again.") }
    finally { setSyncing(false) }
  }

  const avgValence = timeline.length
    ? timeline.reduce((s, d) => s + d.valence, 0) / timeline.length
    : null

  const moodTheme = getMoodTheme(emotions?.dominant_mood)
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const maxEmotion = emotions?.distribution ? Math.max(...Object.values(emotions.distribution)) : 1

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f4] dark:bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf8f4] dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-[#1e1e2a] px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0f]/80 backdrop-blur-sm z-10">
        <button onClick={() => router.push("/")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${moodTheme.gradient} flex items-center justify-center shadow-sm`}>
            <span className="text-sm">🎵</span>
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-slate-100">MoodSync</span>
        </button>
        <div className="flex items-center gap-2">
          {user?.spotify_id && (
            <span className="text-sm text-slate-400 hidden sm:block">@{user.spotify_id}</span>
          )}
          <ThemeToggle />
          <button
            onClick={() => router.push("/share")}
            className={`flex items-center gap-2 bg-gradient-to-r ${moodTheme.gradient} text-white text-sm font-medium px-4 py-2 rounded-xl transition-opacity hover:opacity-90 shadow-sm`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Share
          </button>
          <button
            onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 bg-white dark:bg-[#111118] hover:bg-slate-50 dark:hover:bg-[#1a1a22] border border-slate-200 dark:border-[#2a2a38] text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            {syncing
              ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" /></svg>
            }
            Sync
          </button>
          <button onClick={() => { clearTokens(); router.replace("/") }} className="text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-2 py-2">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {syncMsg && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 animate-fade-up">
            {syncMsg}
          </div>
        )}
        {syncErr && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 animate-fade-up">
            {syncErr}
          </div>
        )}
        {pendingAnalysis > 0 && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 flex items-center gap-3">
            <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-violet-700 rounded-full animate-spin shrink-0" />
            Analysing {pendingAnalysis} track{pendingAnalysis !== 1 ? "s" : ""} in the background — scores will update automatically when done.
          </div>
        )}

        {/* Mood Hero */}
        {emotions ? (
          <div className={`relative bg-gradient-to-br ${moodTheme.gradient} rounded-3xl p-8 mb-8 overflow-hidden animate-fade-up`}>
            {/* Decorative blobs */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/8 pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
              {/* Left: greeting + mood */}
              <div>
                <p className="text-white/70 text-sm font-medium mb-4">
                  {greeting()}, {user?.spotify_id ?? "there"} 👋
                </p>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-6xl drop-shadow">{moodTheme.emoji}</span>
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-widest mb-1">You&apos;ve been feeling</p>
                    <h1 className="text-4xl font-bold text-white tracking-tight leading-none">
                      {moodTheme.label}
                    </h1>
                  </div>
                </div>
                <p className="text-white/50 text-sm">
                  {emotions.analyzed_tracks} tracks analysed · {timeline.length} days of history
                </p>
              </div>

              {/* Right: mini emotion bars */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 min-w-[180px]">
                <p className="text-white/50 text-[10px] uppercase tracking-widest mb-3">Emotion mix</p>
                <div className="space-y-2.5">
                  {Object.entries(emotions.distribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-white/60 text-xs w-16 capitalize">{key}</span>
                        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white/70 rounded-full transition-all duration-700"
                            style={{ width: `${(val / maxEmotion) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* No-data banner */
          <div className="mb-8 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">No mood data yet</p>
              <p className="text-sm text-amber-600 dark:text-amber-400/70 mt-1">
                Sync your Spotify history, then run <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">python scripts/backfill_moods.py</code>
              </p>
            </div>
            <button onClick={handleSync} disabled={syncing}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 whitespace-nowrap shadow-sm">
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-up-1">
          <StatCard
            label="Dominant Mood"
            value={emotions?.dominant_mood ? capitalize(emotions.dominant_mood) : "—"}
            accentColor={moodTheme.accent}
          />
          <StatCard
            label="Tracks Analysed"
            value={emotions?.analyzed_tracks ?? "—"}
            accentColor={moodTheme.accent}
          />
          <StatCard
            label="Lyrical Sentiment"
            value={avgValence !== null
              ? avgValence > 0.05 ? "Positive" : avgValence < -0.05 ? "Negative" : "Neutral"
              : "—"}
            sub={avgValence !== null ? `score: ${avgValence > 0 ? "+" : ""}${avgValence.toFixed(3)}` : undefined}
            accentColor={avgValence !== null && avgValence > 0.05 ? "#10b981" : avgValence !== null && avgValence < -0.05 ? "#f87171" : "#94a3b8"}
          />
          <StatCard
            label="Days Tracked"
            value={timeline.length > 0 ? timeline.length : "—"}
            sub="keep syncing to grow"
            accentColor="#f59e0b"
          />
        </div>

        {/* AI Mood Summary */}
        <div className="mb-6 animate-fade-up-2">
          <MoodSummary />
        </div>

        {/* Mood Timeline */}
        <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 mb-6 shadow-sm animate-fade-up-3">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Mood Timeline</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {timeline.length > 0
                  ? `${timeline[0].date} → ${timeline[timeline.length - 1].date} · ${timeline.length} day${timeline.length > 1 ? "s" : ""}`
                  : "Valence & energy from your listening history"}
              </p>
            </div>
            <select
              value={days}
              onChange={async (e) => {
                const d = Number(e.target.value); setDays(d)
                try { setTimeline(await getTimeline(d)) } catch { /* ignore */ }
              }}
              className="bg-slate-50 dark:bg-[#1a1a22] border border-slate-200 dark:border-[#2a2a38] text-slate-700 dark:text-slate-300 text-sm rounded-lg px-3 py-2 outline-none"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 3 months</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>All time</option>
            </select>
          </div>
          <MoodTimeline data={timeline} />
        </div>

        {/* Mood Forecast */}
        <div className="mb-6 animate-fade-up-4">
          <MoodForecast />
        </div>

        {/* Emotion Breakdown + Top Tracks */}
        <div className="grid md:grid-cols-2 gap-6 mb-6 animate-fade-up-5">
          <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-1 text-slate-900 dark:text-slate-100">Emotion Breakdown</h2>
            <p className="text-sm text-slate-400 mb-6">Aggregated from your last 50 tracks</p>
            <EmotionBreakdown data={emotions?.distribution ?? null} />
          </div>
          <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-1 text-slate-900 dark:text-slate-100">Most Played Tracks</h2>
            <p className="text-sm text-slate-400 mb-4">Your most listened-to songs</p>
            <TopTracksList tracks={topTracks} />
          </div>
        </div>

        {/* Playlist Analyser */}
        <div className="mb-6 animate-fade-up-6">
          <PlaylistAnalyzer />
        </div>

        {/* Mood Check-in */}
        <div className="animate-fade-up-6">
          <MoodCheckinCard />
        </div>
      </main>
    </div>
  )
}
