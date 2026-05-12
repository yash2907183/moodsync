"use client"
import { useEffect, useState } from "react"
import { getCalibration, getRegulation, getLanguageComparison } from "@/lib/api"
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ReferenceLine, Line } from "recharts"
import { useTheme } from "@/lib/theme"

/* ── Helpers ─────────────────────────────────────────── */
function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">{title}</h2>
      <p className="text-xs text-slate-400 mb-5">{subtitle}</p>
      {children}
    </div>
  )
}

function Pill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1a1a22] border border-slate-100 dark:border-[#1e1e2a]">
      <span className="text-lg font-bold" style={{ color: color ?? "#7c3aed" }}>{value}</span>
      <span className="text-[10px] text-slate-400 mt-0.5">{label}</span>
    </div>
  )
}

/* ── 1. Calibration ─────────────────────────────────── */
function CalibrationPanel() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [data, setData]     = useState<any>(null)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCalibration()
      .then(setData)
      .catch(e => setError(e.message?.includes("422") ? "Need at least 3 mood check-ins. Log your mood daily in the Journal tab." : "Could not load calibration."))
      .finally(() => setLoading(false))
  }, [])

  const tooltipStyle = { background: isDark ? "#111118" : "#fff", border: `1px solid ${isDark ? "#1e1e2a" : "#e2e8f0"}`, borderRadius: 8, fontSize: 11 }
  const axisColor = isDark ? "#44445a" : "#94a3b8"

  const corrColor = data ? (Math.abs(data.correlation) > 0.5 ? "#10b981" : Math.abs(data.correlation) > 0.3 ? "#f59e0b" : "#f87171") : "#7c3aed"

  return (
    <SectionCard
      title="Personalised Sentiment Calibration"
      subtitle="How well does the universal AI model predict YOUR mood? Scatter = one day of data."
    >
      {loading && <div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>}
      {error && <p className="text-sm text-amber-500">{error}</p>}
      {data && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Pill label="Pearson r" value={data.correlation} color={corrColor} />
            <Pill label="p-value" value={data.p_value} color={data.p_value < 0.05 ? "#10b981" : "#f59e0b"} />
            <Pill label="Strength" value={data.strength} color={corrColor} />
            <Pill label="Days matched" value={data.n_points} />
          </div>

          <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40 rounded-xl px-4 py-3 text-sm text-violet-700 dark:text-violet-300 leading-relaxed">
            {data.interpretation}
          </div>

          <div>
            <p className="text-[10px] text-slate-400 mb-1">Universal model (x) vs your check-in (y) · each dot = one day</p>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="universal_valence" type="number" domain={[-1, 1]} name="Model valence"
                  tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false}
                  label={{ value: "← Heavy  Model score  Uplifting →", position: "insideBottom", offset: -2, fontSize: 8, fill: axisColor }} />
                <YAxis dataKey="user_mood" type="number" domain={[-1, 1]} name="Your mood"
                  tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} width={40}
                  label={{ value: "Your mood", angle: -90, position: "insideLeft", fontSize: 8, fill: axisColor }} />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(v: unknown, n: string) => [typeof v === "number" ? v.toFixed(2) : v, n === "universal_valence" ? "Model" : "Your mood"]}
                  labelFormatter={() => ""} />
                <ReferenceLine x={0} stroke={isDark ? "#2a2a38" : "#e2e8f0"} />
                <ReferenceLine y={0} stroke={isDark ? "#2a2a38" : "#e2e8f0"} />
                <Scatter data={data.points} fill="#7c3aed" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="text-xs text-slate-400 bg-slate-50 dark:bg-[#1a1a22] rounded-xl px-4 py-3">
            <span className="font-medium text-slate-600 dark:text-slate-300">Your calibration formula: </span>
            personal_score = {data.slope > 0 ? "+" : ""}{data.slope} × model_score {data.intercept >= 0 ? "+" : ""}{data.intercept}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

/* ── 2. Emotion Regulation ──────────────────────────── */
function RegulationPanel() {
  const [data, setData]     = useState<any>(null)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRegulation()
      .then(setData)
      .catch(e => setError(e.message?.includes("422") ? "Need more listening history to classify sessions." : "Could not load regulation data."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SectionCard
      title="Emotion Regulation Strategy"
      subtitle="How do you use music to manage your emotions? Based on lyrical mood trajectory within listening sessions."
    >
      {loading && <div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>}
      {error && <p className="text-sm text-amber-500">{error}</p>}
      {data && (
        <div className="space-y-5">
          <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40 rounded-xl px-4 py-3 text-sm text-violet-700 dark:text-violet-300 leading-relaxed">
            {data.interpretation}
          </div>

          {/* Distribution */}
          <div>
            <p className="text-xs text-slate-400 mb-2">Strategy distribution across {data.total_sessions} sessions</p>
            <div className="space-y-1.5">
              {Object.entries(data.strategy_distribution as Record<string, number>)
                .sort(([, a], [, b]) => b - a)
                .map(([strategy, count]) => {
                  const session = data.sessions.find((s: any) => s.strategy === strategy)
                  const color   = session?.color ?? "#7c3aed"
                  const pct     = Math.round((count / data.total_sessions) * 100)
                  return (
                    <div key={strategy} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-44 shrink-0">{strategy}</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-[#1e1e2a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="text-xs tabular-nums text-slate-400 w-12 text-right">{count}× ({pct}%)</span>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Recent sessions */}
          <div>
            <p className="text-xs text-slate-400 mb-2">Recent sessions</p>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {[...data.sessions].reverse().map((s: any, i: number) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1a22]">
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: s.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium" style={{ color: s.color }}>{s.strategy}</span>
                      <span className="text-[10px] text-slate-400">{s.date} · {s.tracks} tracks</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{s.sample_tracks.join(" → ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

/* ── 3. Language Comparison ─────────────────────────── */
const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", ur: "Urdu", ar: "Arabic",
  fr: "French",  es: "Spanish", de: "German", pt: "Portuguese",
  ta: "Tamil",   te: "Telugu",  pa: "Punjabi",
}

function LanguagePanel() {
  const [data, setData]     = useState<any>(null)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLanguageComparison()
      .then(setData)
      .catch(e => setError(e.message?.includes("422") ? "Need more multilingual data. Sync tracks in multiple languages first." : "Could not load language data."))
      .finally(() => setLoading(false))
  }, [])

  const EMOTION_COLORS: Record<string, string> = {
    joy: "#f59e0b", sadness: "#6366f1", anger: "#ef4444",
    fear: "#64748b", optimism: "#10b981",
  }

  return (
    <SectionCard
      title="Language-Aware Sentiment Analysis"
      subtitle="English tracks use j-hartmann (7-emotion). Non-English use XLM-RoBERTa (multilingual). How do they compare?"
    >
      {loading && <div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>}
      {error && <p className="text-sm text-amber-500">{error}</p>}
      {data && (
        <div className="space-y-5">
          <p className="text-xs text-slate-400 italic">{data.note}</p>

          <div className="grid gap-4 md:grid-cols-2">
            {data.groups.map((g: any) => {
              const name = LANG_NAMES[g.language] ?? g.language.toUpperCase()
              const isEn = g.language === "en"
              const moodLabel = g.avg_valence > 0.1 ? "Uplifting" : g.avg_valence < -0.1 ? "Heavy" : "Neutral"
              const moodColor = g.avg_valence > 0.1 ? "#10b981" : g.avg_valence < -0.1 ? "#f87171" : "#7c3aed"
              return (
                <div key={g.language} className="border border-slate-100 dark:border-[#1e1e2a] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{name}</span>
                      <span className="ml-2 text-[10px] text-slate-400">{g.track_count} tracks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ color: moodColor, borderColor: `${moodColor}40`, background: `${moodColor}12` }}>{moodLabel}</span>
                      {isEn
                        ? <span className="text-[10px] text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-full">j-hartmann</span>
                        : <span className="text-[10px] text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">XLM-RoBERTa</span>
                      }
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(g.emotions as Record<string, number>)
                      .filter(([k]) => EMOTION_COLORS[k])
                      .sort(([, a], [, b]) => b - a)
                      .map(([emotion, score]) => (
                        <div key={emotion} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-14 capitalize">{emotion}</span>
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-[#1e1e2a] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.round(score * 100)}%`, background: EMOTION_COLORS[emotion] }} />
                          </div>
                          <span className="text-[10px] tabular-nums text-slate-400 w-8 text-right">{(score * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

/* ── Page ────────────────────────────────────────────── */
export default function ResearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Research</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Advanced sentiment analysis — personalisation, emotion regulation, and cross-lingual mood modelling
        </p>
      </div>
      <CalibrationPanel />
      <RegulationPanel />
      <LanguagePanel />
    </div>
  )
}
