"use client"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { storeTokens } from "@/lib/auth"

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token       = params.get("token")
    const spotifyToken = params.get("spotify_token")
    const expiresIn   = params.get("expires_in")
    const err         = params.get("error")

    if (err) {
      setError("Authentication failed. Please try again.")
      return
    }

    if (!token || !spotifyToken) {
      setError("Missing tokens. Please try logging in again.")
      return
    }

    storeTokens(token, spotifyToken, expiresIn ? parseInt(expiresIn) : 1800)
    router.replace("/dashboard")
  }, [params, router])

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/" className="text-violet-400 hover:underline text-sm">
            ← Go back to login
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#6b7280]">Logging you in...</p>
      </div>
    </main>
  )
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
