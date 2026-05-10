import { getJwt, clearTokens } from "./auth"
import type {
  TimelinePoint, EmotionsResponse, ListenRecord,
  UserInfo,
} from "@/types"

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const jwt = getJwt()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  }

  const res = await fetch(path, { ...options, headers })

  if (res.status === 401) {
    clearTokens()
    window.location.replace("/")
    throw new Error("Unauthorized")
  }

  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

export async function getLogin(): Promise<{ auth_url: string }> {
  return request("/api/auth/login")
}

export async function getMe(): Promise<UserInfo> {
  return request("/api/auth/me")
}

export async function syncTracks(
  spotifyToken: string,
  limit = 50,
): Promise<{ message: string; count: number; last_sync: string }> {
  return request(
    `/api/tracks/sync?spotify_access_token=${encodeURIComponent(spotifyToken)}&limit=${limit}`,
    { method: "POST" },
  )
}

export async function getRecentTracks(limit = 20): Promise<ListenRecord[]> {
  return request(`/api/tracks/recent?limit=${limit}`)
}

export async function getAnalysisStatus(): Promise<{ pending: number }> {
  return request("/api/tracks/analysis-status")
}

export async function getTimeline(days = 30): Promise<TimelinePoint[]> {
  return request(`/api/insights/timeline?days=${days}`)
}

export async function getEmotions(limit = 50): Promise<EmotionsResponse | null> {
  const data = await request<EmotionsResponse | { message: string }>(
    `/api/insights/emotions?limit=${limit}`,
  )
  if ("message" in data) return null
  return data
}

export async function getTopTracks(limit = 10): Promise<{
  tracks: { track_id: string; name: string; artist: string[]; plays: number }[]
}> {
  return request(`/api/tracks/top?limit=${limit}`)
}

export async function getTodayCheckin(): Promise<{ checkin: number | null; notes: string | null }> {
  return request("/api/mood/checkin/today")
}

export async function submitCheckin(mood: number, notes?: string): Promise<{ checkin_id: number }> {
  return request("/api/mood/checkin", {
    method: "POST",
    body: JSON.stringify({ day: new Date().toISOString(), mood_1to5: mood, notes: notes ?? null }),
  })
}

export async function getMoodCorrelation(days = 30): Promise<{
  points: { date: string; user_mood: number; user_normalised: number; ai_valence: number }[]
  correlation: number | null
  checkin_count: number
  days: number
}> {
  return request(`/api/mood/correlation?days=${days}`)
}

export async function getMoodSummary(days = 7): Promise<{
  summary: string
  generated_at: string
  days: number
  tracks_analyzed: number
}> {
  return request(`/api/summary/mood?days=${days}`)
}

export async function getForecastNarrative(horizon = 7): Promise<{
  narrative: string | null
  reason?: string
  generated_at?: string
}> {
  return request(`/api/summary/forecast?horizon=${horizon}`)
}

export async function getMoodForecast(horizon = 7): Promise<{
  history: { date: string; valence: number }[]
  forecast: { date: string; valence: number; lower: number; upper: number }[]
  sparse_data: boolean
  data_points: number
  hist_mean: number
}> {
  return request(`/api/insights/predict?horizon=${horizon}`)
}

export async function startPlaylistAnalysis(
  playlistUrl: string,
  spotifyToken: string,
): Promise<{ job_id: string; status: string }> {
  return request(
    `/api/playlists/analyze?playlist_url=${encodeURIComponent(playlistUrl)}&spotify_token=${encodeURIComponent(spotifyToken)}`,
    { method: "POST" },
  )
}

export interface PlaylistTrack {
  name: string
  artist: string
  valence: number | null
  energy: number | null
}

export interface PlaylistJobResult {
  job_id: string
  status: "pending" | "running" | "done" | "error"
  playlist_name: string | null
  total_tracks: number
  analyzed_tracks: number
  result: {
    playlist_name: string
    total_tracks: number
    analyzed_tracks: number
    avg_valence: number | null
    avg_energy: number | null
    tracks: PlaylistTrack[]
  } | null
  error: string | null
}

export async function getPlaylistJob(jobId: string): Promise<PlaylistJobResult> {
  return request(`/api/playlists/jobs/${jobId}`)
}

export async function generatePlaylistMusic(jobId: string): Promise<{
  prompt: string
  audio_b64: string
  format: string
}> {
  return request(`/api/playlists/jobs/${jobId}/generate-music`, { method: "POST" })
}
