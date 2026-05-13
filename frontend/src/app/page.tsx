"use client"
import { useState } from "react"
import { getLogin } from "@/lib/api"
import { useTheme } from "@/lib/theme"

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} aria-label="Toggle theme"
      className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-sm text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-none">
      {theme === "dark" ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx={12} cy={12} r={5} /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function Equalizer() {
  return (
    <div className="flex items-end gap-[3px] h-8">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-1.5 bg-violet-500 dark:bg-violet-400 rounded-full"
          style={{ animation: `eq ${0.6 + i * 0.15}s ${i * 0.1}s ease-in-out infinite alternate`, height: `${8 + i * 4}px` }} />
      ))}
    </div>
  )
}

const FLOATING_EMOJIS = [
  { emoji: "🔥", style: { top: "15%",    left: "8%",   fontSize: "2.5rem" }, anim: "animate-float"  },
  { emoji: "✨", style: { top: "25%",    right: "10%", fontSize: "2rem"   }, anim: "animate-float2" },
  { emoji: "🌧️", style: { bottom: "30%", left: "12%",  fontSize: "1.8rem" }, anim: "animate-float3" },
  { emoji: "🌤️", style: { bottom: "20%", right: "8%",  fontSize: "2.2rem" }, anim: "animate-float4" },
  { emoji: "🎵", style: { top: "55%",    left: "5%",   fontSize: "1.5rem" }, anim: "animate-float5" },
  { emoji: "💜", style: { top: "10%",    right: "25%", fontSize: "1.4rem" }, anim: "animate-float2" },
]

const FEATURES = [
  { icon: "📈", title: "Emotion Timeline",     desc: "Daily lyrical mood plotted from your listening history — see trends over days and weeks" },
  { icon: "🎯", title: "Mood Forecast",        desc: "7-day prediction of your emotional trajectory with a confidence band" },
  { icon: "📓", title: "Mood Journal",         desc: "Log how you feel each day and see how closely your music mirrors your actual mood" },
  { icon: "🔬", title: "Research Analytics",  desc: "Sentiment calibration, emotion regulation strategy, and genre mood breakdown" },
]

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleLogin() {
    setLoading(true); setError(null)
    try {
      const { auth_url } = await getLogin()
      window.location.href = auth_url
    } catch {
      setError("Could not connect. Make sure the backend is running on port 8000.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f4] dark:bg-[#07070e] text-slate-900 dark:text-white overflow-hidden relative flex flex-col transition-colors duration-200">

      {/* Aurora blobs — subtle in light, vivid in dark */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="animate-blob  absolute -top-40 -left-32   w-[600px] h-[600px] rounded-full bg-violet-400/15 dark:bg-violet-600/20 blur-[100px]" />
        <div className="animate-blob2 absolute -bottom-40 -right-32 w-[500px] h-[500px] rounded-full bg-indigo-400/15 dark:bg-indigo-600/20 blur-[100px]" />
        <div className="animate-blob  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-pink-400/8 dark:bg-pink-600/10 blur-[120px]" style={{ animationDelay: "3s" }} />
        <div className="animate-blob2 absolute top-20 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-400/8 dark:bg-cyan-600/10 blur-[80px]" style={{ animationDelay: "5s" }} />
      </div>

      {/* Floating emojis */}
      {FLOATING_EMOJIS.map((f, i) => (
        <div key={i} className={`absolute pointer-events-none select-none opacity-15 dark:opacity-30 ${f.anim}`} style={f.style}>
          {f.emoji}
        </div>
      ))}

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/50">🎵</div>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">MoodSync</span>
        </div>
        <ThemeToggle />
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-16">

        {/* Equalizer pill */}
        <div className="flex items-center gap-3 mb-8 animate-fade-up">
          <Equalizer />
          <span className="text-sm text-slate-400 dark:text-white/40 tracking-widest uppercase">Now analysing your music</span>
          <Equalizer />
        </div>

        {/* Headline */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold leading-none tracking-tight mb-6 animate-fade-up-1 text-slate-900 dark:text-white">
          Your music,<br />
          <span className="text-shimmer">your mood.</span>
        </h1>

        <p className="text-slate-500 dark:text-white/50 text-lg sm:text-xl mb-10 max-w-lg leading-relaxed animate-fade-up-2">
          Connect Spotify and discover what your listening history says about your emotional state — powered by j-hartmann RoBERTa and Last.fm enrichment.
        </p>

        {/* CTA */}
        <div className="animate-fade-up-3 mb-4">
          <button
            onClick={handleLogin} disabled={loading}
            className="animate-pulse-glow inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-colors duration-200"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                Connect with Spotify
              </>
            )}
          </button>
        </div>
        <p className="text-slate-400 dark:text-white/25 text-xs animate-fade-up-3">Free · Spotify account required</p>

        {error && <p className="mt-4 text-red-500 dark:text-red-400 text-sm animate-fade-up">{error}</p>}

        {/* Feature cards */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full animate-fade-up-4">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/8 border border-slate-200 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/15 rounded-2xl p-4 text-left transition-all duration-200 group cursor-default shadow-sm dark:shadow-none backdrop-blur-sm">
              <div className="text-2xl mb-3 group-hover:scale-110 transition-transform duration-200">{f.icon}</div>
              <p className="text-sm font-semibold text-slate-700 dark:text-white/80 mb-1">{f.title}</p>
              <p className="text-xs text-slate-400 dark:text-white/35 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-6 text-slate-300 dark:text-white/20 text-xs">
        moodsync · built with j-hartmann RoBERTa, XLM-RoBERTa & Last.fm
      </footer>
    </div>
  )
}
