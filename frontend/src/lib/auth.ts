const JWT_KEY     = "ms_jwt"
const SPOTIFY_KEY = "ms_spotify_token"
const EXPIRY_KEY  = "ms_token_expiry"

export function getJwt(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(JWT_KEY)
}

export function getSpotifyToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(SPOTIFY_KEY)
}

export function isSpotifyTokenExpired(): boolean {
  if (typeof window === "undefined") return true
  const expiry = localStorage.getItem(EXPIRY_KEY)
  if (!expiry) return true
  return Date.now() > parseInt(expiry, 10)
}

export function storeTokens(jwt: string, spotifyToken: string, expiresIn: number): void {
  localStorage.setItem(JWT_KEY,     jwt)
  localStorage.setItem(SPOTIFY_KEY, spotifyToken)
  localStorage.setItem(EXPIRY_KEY,  String(Date.now() + expiresIn * 1000))
}

export function clearTokens(): void {
  localStorage.removeItem(JWT_KEY)
  localStorage.removeItem(SPOTIFY_KEY)
  localStorage.removeItem(EXPIRY_KEY)
}
