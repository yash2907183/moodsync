"use client"
import { useEffect, useState } from "react"
import { getRegulation, getLanguageComparison, getGenreMood } from "@/lib/api"

type RegData     = Awaited<ReturnType<typeof getRegulation>>
type RegSession  = RegData["sessions"][number]
type LangData    = Awaited<ReturnType<typeof getLanguageComparison>>
type LangGroup   = LangData["groups"][number]
type GenreData   = Awaited<ReturnType<typeof getGenreMood>>["genres"][number]

const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", ur: "Urdu", ar: "Arabic",
  fr: "French",  es: "Spanish", de: "German", pt: "Portuguese",
  ta: "Tamil",   te: "Telugu",  pa: "Punjabi",
}

const EMOTION_COLORS: Record<string, string> = {
  joy: "#f59e0b", sadness: "#6366f1", anger: "#ef4444",
  fear: "#64748b", optimism: "#10b981",
}

function valenceLabel(v: number): { text: string; color: string } {
  if (v < -0.4) return { text: "Heavy",     color: "#ef4444" }
  if (v < -0.1) return { text: "Dark",      color: "#f87171" }
  if (v <  0.1) return { text: "Neutral",   color: "#94a3b8" }
  if (v <  0.4) return { text: "Uplifting", color: "#10b981" }
  return              { text: "Bright",    color: "#34d399" }
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-hanken text-[20px] font-semibold text-on-surface">{title}</h2>
      <p className="text-[14px] text-on-surface-variant mt-0.5">{subtitle}</p>
    </div>
  )
}

function Spinner() {
  return (
    <div className="h-40 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="text-sm text-tertiary py-4">{msg}</p>
}

/* ── 1. Calibration ─────────────────────────────────────── */
function CalibrationPanel() {
  return (
    <section className="col-span-12 lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
      <SectionHeader
        title="Personalised Sentiment Calibration"
        subtitle="How well does the universal AI model predict YOUR mood? Scatter = one day of data."
      />
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <span className="material-symbols-outlined text-primary text-[40px]">lock_clock</span>
        <p className="font-hanken text-[18px] font-semibold text-on-surface">Results revealed after the study</p>
        <p className="text-[14px] text-on-surface-variant max-w-sm">Your calibration data is being recorded. Results will be shown once the 7-day study period is complete.</p>
      </div>
    </section>
  )
}

/* ── 2. Emotion Regulation ──────────────────────────────── */
function RegulationPanel() {
  const [data, setData]       = useState<RegData | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRegulation()
      .then(setData)
      .catch(e => setError(e.message?.includes("422")
        ? "Need more listening history to classify sessions."
        : "Could not load regulation data."))
      .finally(() => setLoading(false))
  }, [])

  const strategyColors: Record<string, string> = {
    "Diversion":        "#ffb784",
    "Upregulation":     "#4ade80",
    "Rumination":       "#ffb4ab",
    "Mood Maintenance": "#d2bbff",
    "Mood Repair":      "#a78bfa",
  }

  return (
    <section className="col-span-12 lg:col-span-5 bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
      <SectionHeader
        title="Emotion Regulation Strategy"
        subtitle="How do you use music to manage your emotions?"
      />
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {data && (
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-[14px] text-on-surface">{data.interpretation}</p>
          </div>

          <div className="space-y-3">
            {Object.entries(data.strategy_distribution as Record<string, number>)
              .sort(([, a], [, b]) => b - a)
              .map(([strategy, count]) => {
                const pct   = Math.round((count / data.total_sessions) * 100)
                const color = strategyColors[strategy] ?? "#d2bbff"
                return (
                  <div key={strategy} className="space-y-1">
                    <div className="flex justify-between font-geist text-[10px] uppercase tracking-wider">
                      <span className="text-on-surface-variant">{strategy}</span>
                      <span style={{ color }}>{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            <p className="font-geist text-[10px] tracking-wider uppercase text-on-surface-variant sticky top-0 bg-surface-dim py-1">
              Recent Strategy Sessions
            </p>
            {[...data.sessions].reverse().map((s: RegSession, i: number) => (
              <div key={i} className="bg-surface-container-high p-2 rounded border border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[16px]" style={{ color: s.color }}>trending_up</span>
                  <span className="font-geist text-[11px] text-on-surface truncate">{s.sample_tracks.join(" → ")}</span>
                </div>
                <span className="font-geist text-[10px] text-on-surface-variant shrink-0 ml-2">{s.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/* ── 3. Genre Mood Breakdown ────────────────────────────── */
function GenreMoodPanel() {
  const [data, setData]       = useState<GenreData[] | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGenreMood()
      .then(d => setData(d.genres))
      .catch(e => setError(e.message?.includes("422")
        ? "Not enough tagged data yet. Sync more tracks."
        : "Could not load genre data."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="col-span-12">
      <h3 className="font-hanken text-[20px] font-semibold text-on-surface mb-4">Genre Mood Breakdown</h3>
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((g: GenreData) => {
            const vl       = valenceLabel(g.avg_valence)
            const domColor = EMOTION_COLORS[g.dominant_emotion] ?? "#d2bbff"
            const emotions = Object.entries(g.emotions as Record<string, number>)
              .filter(([k]) => EMOTION_COLORS[k])
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
            return (
              <div key={g.genre} className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-hanken text-[18px] font-semibold text-on-surface capitalize">{g.genre}</h4>
                    <p className="font-geist text-[10px] text-on-surface-variant">{g.track_count} tracks · {g.listen_count} plays</p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full font-geist text-[10px] uppercase tracking-wider border capitalize"
                    style={{ color: domColor, backgroundColor: `${domColor}15`, borderColor: `${domColor}30` }}
                  >
                    {g.dominant_emotion}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {emotions.map(([emotion, score]) => (
                    <div key={emotion} className="flex justify-between items-center gap-2">
                      <span className="font-geist text-[9px] uppercase tracking-wider text-on-surface-variant w-20">{emotion}</span>
                      <div className="flex-1 h-1 bg-surface-variant rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.round(score * 100)}%`, backgroundColor: EMOTION_COLORS[emotion] }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-outline-variant">
                  <div className="flex justify-between font-geist text-[9px] uppercase tracking-wider mb-1">
                    <span className="text-on-surface-variant">Valence</span>
                    <span style={{ color: vl.color }}>{vl.text}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-tertiary"
                      style={{ width: `${Math.round(((g.avg_valence + 1) / 2) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ── 4. Language Comparison ─────────────────────────────── */
function LanguagePanel() {
  const [data, setData]       = useState<LangData | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLanguageComparison()
      .then(setData)
      .catch(e => setError(e.message?.includes("422")
        ? "Need more multilingual data. Sync tracks in multiple languages first."
        : "Could not load language data."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="col-span-12">
      <h3 className="font-hanken text-[20px] font-semibold text-on-surface mb-4">Language-Aware Sentiment Analysis</h3>
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.groups.map((g: LangGroup) => {
            const name       = LANG_NAMES[g.language] ?? g.language.toUpperCase()
            const isEn       = g.language === "en"
            const vl         = valenceLabel(g.avg_valence)
            const emotions   = Object.entries(g.emotions as Record<string, number>)
              .filter(([k]) => EMOTION_COLORS[k])
              .sort(([, a], [, b]) => b - a)
            return (
              <div key={g.language} className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col md:flex-row gap-6 items-center">
                {/* Donut chart */}
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="56" cy="56" r="48" fill="transparent" className="text-surface-variant" stroke="currentColor" strokeWidth="8" />
                    <circle cx="56" cy="56" r="48" fill="transparent" stroke={vl.color}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 48}`}
                      strokeDashoffset={`${2 * Math.PI * 48 * (1 - Math.max(0, (g.avg_valence + 1) / 2))}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-hanken text-[22px] font-semibold">{Math.round(((g.avg_valence + 1) / 2) * 100)}%</span>
                    <span className="font-geist text-[8px] uppercase tracking-wider text-on-surface-variant">Sentiment</span>
                  </div>
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-hanken text-[18px] font-semibold text-on-surface">{name}</h4>
                      <p className="font-geist text-[10px] text-on-surface-variant">{g.track_count} tracks</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded-full font-geist text-[9px] uppercase tracking-wider border"
                        style={{ color: vl.color, backgroundColor: `${vl.color}15`, borderColor: `${vl.color}30` }}>
                        {vl.text}
                      </span>
                      <span className="font-geist text-[9px] text-on-surface-variant">
                        {isEn ? "j-hartmann/RoBERTa" : "XLM-RoBERTa"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {emotions.map(([emotion, score]) => (
                      <div key={emotion} className="flex items-center gap-2">
                        <span className="font-geist text-[10px] text-on-surface-variant w-14 capitalize">{emotion}</span>
                        <div className="flex-1 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round(score * 100)}%`, backgroundColor: EMOTION_COLORS[emotion] }} />
                        </div>
                        <span className="font-geist text-[10px] text-on-surface-variant w-8 text-right">{(score * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ── Page ────────────────────────────────────────────────── */
export default function ResearchPage() {
  return (
    <div>
      <header className="mb-6 md:mb-12">
        <h1 className="font-hanken text-[24px] md:text-[32px] font-semibold leading-tight tracking-[-0.01em] text-on-surface">Research Lab</h1>
        <p className="text-sm md:text-base text-on-surface-variant mt-1">
          Deep algorithmic analysis of your musical emotional footprint.
        </p>
      </header>
      <div className="grid grid-cols-12 gap-6">
        <CalibrationPanel />
        <RegulationPanel />
        <GenreMoodPanel />
        <LanguagePanel />
      </div>
    </div>
  )
}
