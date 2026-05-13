"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getJwt, getSpotifyToken, isSpotifyTokenExpired, clearTokens } from "@/lib/auth"
import { getMe, syncTracks, submitLyrics, getAnalysisStatus } from "@/lib/api"
import type { TrackNeedingLyrics } from "@/lib/api"
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

  let lyrics = await tryLyricsOvh(artist, originalTitle)
  if (lyrics) return lyrics

  if (cleanedTitle !== originalTitle) {
    lyrics = await tryLyricsOvh(artist, cleanedTitle)
    if (lyrics) return lyrics
  }

  lyrics = await tryChartLyrics(artist, cleanedTitle || originalTitle)
  if (lyrics) return lyrics

  if (cleanedTitle !== originalTitle) {
    lyrics = await tryChartLyrics(artist, originalTitle)
    if (lyrics) return lyrics
  }

  return ""
}

const NAV = [
  { href: "/dashboard",          label: "Overview",  icon: "dashboard" },
  { href: "/dashboard/insights", label: "Insights",  icon: "insights" },
  { href: "/dashboard/tracks",   label: "Tracks",    icon: "audiotrack" },
  { href: "/dashboard/journal",  label: "Journal",   icon: "edit_note" },
  { href: "/dashboard/research", label: "Research",  icon: "science" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser]       = useState<UserInfo | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null)

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

      const needLyrics = res.tracks_needing_lyrics ?? []
      if (needLyrics.length > 0) {
        setPending(needLyrics.length)
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
    <div className="flex min-h-screen bg-background text-on-background">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 flex flex-col bg-surface-container-lowest border-r border-outline-variant fixed h-full z-50 py-6 px-4 gap-6 overflow-y-auto">
        {/* Brand */}
        <button onClick={() => router.push("/")} className="flex items-center gap-3 px-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[20px]">music_note</span>
          </div>
          <div className="text-left">
            <p className="font-hanken font-bold text-on-surface text-[15px] leading-none">MoodSync</p>
            <p className="text-[10px] font-geist tracking-widest text-on-surface-variant/60 mt-0.5 uppercase">Emotional Analytics</p>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <button key={href} onClick={() => router.push(href)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
                  active
                    ? "text-primary bg-primary/10 border-r-2 border-primary scale-[0.98]"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                <span className="font-geist text-[12px] tracking-[0.05em] font-semibold uppercase">{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="flex flex-col gap-3">
          {pending > 0 && (
            <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-primary flex items-center gap-2">
              <div className="w-2.5 h-2.5 border border-primary/40 border-t-primary rounded-full animate-spin shrink-0" />
              Analysing {pending} tracks…
            </div>
          )}
          {syncMsg && (
            <p className="text-[11px] text-on-surface-variant px-1">{syncMsg}</p>
          )}
          <button onClick={handleSync} disabled={syncing}
            className="w-full bg-primary-container text-white py-2 px-4 rounded-full font-geist text-[12px] tracking-[0.05em] font-semibold uppercase hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {syncing
              ? <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Syncing…</>
              : <><span className="material-symbols-outlined text-[16px]">sync</span> Sync Spotify</>
            }
          </button>
          <div className="border-t border-outline-variant/30 pt-3 flex flex-col gap-1">
            <button
              onClick={() => { clearTokens(); router.replace("/") }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="font-geist text-[12px] tracking-[0.05em] font-semibold uppercase">Logout</span>
            </button>
            {user && (
              <p className="text-[10px] text-on-surface-variant/50 px-3 truncate">
                {user.display_name ?? user.spotify_id}
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-[220px]">
        <main className="max-w-[1440px] mx-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
