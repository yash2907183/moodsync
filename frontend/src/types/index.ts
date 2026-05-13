export interface TimelinePoint {
  date: string
  valence: number
  energy: number
  count: number
}

export interface EmotionDistribution {
  joy: number
  sadness: number
  anger: number
  fear: number
  optimism: number
}

export interface EmotionsResponse {
  analyzed_tracks: number
  dominant_mood: keyof EmotionDistribution
  distribution: EmotionDistribution
  top_genre: string | null
}

export interface ListenRecord {
  listen_id: number
  user_id: string
  track_id: string
  played_at: string
  ms_played: number | null
}

export interface UserInfo {
  user_id: string
  spotify_id: string | null
  display_name: string | null
  email: string | null
  created_at: string
  is_active: boolean
  last_sync: string | null
}

export interface MoodFilterTrack {
  track_id: string
  name: string
  artist: string[]
  match_score: number
  valence: number | null
}

export interface MoodFilterResponse {
  filter: string
  count: number
  tracks: MoodFilterTrack[]
}

export interface CorrelationPoint {
  date: string
  user_mood: number
  user_normalised: number
  ai_valence: number
}

export interface CorrelationResponse {
  points: CorrelationPoint[]
  correlation: number | null
  checkin_count: number
  days: number
}
