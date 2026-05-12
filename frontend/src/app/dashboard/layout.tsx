"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getJwt, getSpotifyToken, isSpotifyTokenExpired, clearTokens } from "@/lib/auth"
import { getMe, syncTracks, submitLyrics, getAnalysisStatus } from "@/lib/api"
import type { TrackNeedingLyrics } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import type { UserInfo } from "@/types"

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(feat\..*?\)/gi, "")
    .replace(/\s*feat\..*$/gi, "")
    .replace(/\s*\(with .*?\)/gi, "")
    .replace(/\s*-\s*(Remaster|Remix|Radio Edit|Live|Acoustic|Official).*$/gi, "")
    .replace(/\s*\[.*?\]/g, "")
    .trim()
}

function fetchWithTimeout(url: string, ms = 7000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer))
}

async function tryLyricsOvh(artist: string, title: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(
      `https://lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
    )
    if (!res.ok) return ""
    const data = await res.json()
    return typeof data.lyrics === "string" && data.lyrics.trim().length > 50
      ? data.lyrics.trim()
      : ""
  } catch {
    return ""
  }
}

async function tryChartLyrics(artist: string, title: string): Promise<string> {
  try {
    const url = `https://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(title)}`
    const res = await fetchWithTimeout(url)
    if (!res.ok) return ""
    const text = await res.text()
    const parser = new DOMParser()
    const xml = parser.parseFromString(text, "text/xml")
    const lyric = xml.querySelector("Lyric")?.textContent ?? ""
    return lyric.trim().length > 50 ? lyric.trim() : ""
  } catch {
    return ""
  }
}

async function fetchLyricsFromBrowser(track: TrackNeedingLyrics): Promise<string> {
  const originalTitle = track.name
  const cleanedTitle  = cleanTitle(track.name)
  const artist        = track.artist

  // Strategy 1: lyrics.ovh with original title
  let lyrics = await tryLyricsOvh(artist, originalTitle)
  if (lyrics) return lyrics

  // Strategy 2: lyrics.ovh with cleaned title (strip feat., remixes etc.)
  if (cleanedTitle !== originalTitle) {
    lyrics = await tryLyricsOvh(artist, cleanedTitle)
    if (lyrics) return lyrics
  }

  // Strategy 3: ChartLyrics with cleaned title
  lyrics = await tryChartLyrics(artist, cleanedTitle || originalTitle)
  if (lyrics) return lyrics

  // Strategy 4: ChartLyrics with original title (different format may match)
  if (cleanedTitle !== originalTitle) {
    lyrics = await tryChartLyrics(artist, originalTitle)
    if (lyrics) return lyrics
  }

  return ""
}

const NAV = [
  { href: "/dashboard",          label: "Overview",  icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/dashboard/insights", label: "Insights",  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/dashboard/tracks",   label: "Tracks",    icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" },
  { href: "/dashboard/journal",  label: "Journal",   icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { href: "/dashboard/research", label: "Research",  icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
]
// Playlist and Share removed — not relevant to research focus

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser]           = useState<UserInfo | null>(null)
  const [syncing, setSyncing]     = useState(false)
  const [syncMsg, setSyncMsg]     = useState<string | null>(null)
  const [pending, setPending]     = useState(0)
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!getJwt()) { router.replace("/"); return }
    getMe().then(setUser).catch(() => { clearTokens(); router.replace("/") })
  }, [router])

  function startPoll() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { pending: p } = await getAnalysisStatus()
        setPending(p)
        if (p === 0) { clearInterval(pollRef.current!); pollRef.current = null }
      } catch { /* ignore */ }
    }, 5000)
  }

  async function handleSync() {
    const tok = getSpotifyToken()
    if (!tok || isSpotifyTokenExpired()) { setSyncMsg("Spotify session expired — please log in again."); return }
    setSyncing(true); setSyncMsg(null)
    try {
      const res = await syncTracks(tok)
      setSyncMsg(`Synced ${res.count} tracks`)

      // Fetch lyrics from browser (residential IP) for tracks that need them
      const needLyrics = res.tracks_needing_lyrics ?? []
      if (needLyrics.length > 0) {
        setPending(needLyrics.length)
        // Process in batches of 5 to avoid overwhelming the browser
        for (let i = 0; i < needLyrics.length; i += 5) {
          const batch = needLyrics.slice(i, i + 5)
          await Promise.allSettled(
            batch.map(async (track) => {
              const lyrics = await fetchLyricsFromBrowser(track)
              await submitLyrics(track.track_id, lyrics)
              setPending(p => Math.max(0, p - 1))
            })
          )
        }
        setPending(0)
      }

      const { pending: p } = await getAnalysisStatus()
      setPending(p)
      if (p > 0) startPoll()
    } catch { setSyncMsg("Sync failed") }
    finally { setSyncing(false) }
  }

  return (
    <div className="flex min-h-screen bg-[#faf8f4] dark:bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-[#0f0f17] border-r border-white/5 fixed h-full z-20">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <button onClick={() => router.push("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="text-xs">🎵</span>
            </div>
            <span className="font-bold text-white text-sm">MoodSync</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <button key={href} onClick={() => router.push(href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon} />
                </svg>
                {label}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          {pending > 0 && (
            <div className="px-3 py-2 rounded-xl bg-violet-600/10 border border-violet-600/20 text-xs text-violet-300 flex items-center gap-2">
              <div className="w-2.5 h-2.5 border border-violet-400 border-t-violet-200 rounded-full animate-spin shrink-0" />
              Analysing {pending} tracks…
            </div>
          )}
          {syncMsg && (
            <p className="text-xs text-slate-400 px-3">{syncMsg}</p>
          )}
          <button onClick={handleSync} disabled={syncing}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
          >
            {syncing
              ? <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Syncing…</>
              : <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" /></svg> Sync</>
            }
          </button>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-500 truncate">{user?.spotify_id ?? "…"}</span>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button onClick={() => { clearTokens(); router.replace("/") }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                title="Logout"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-56">
        <main className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
