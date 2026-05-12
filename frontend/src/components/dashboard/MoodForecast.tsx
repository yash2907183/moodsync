"use client"
import { useEffect, useState } from "react"
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts"
import { getMoodForecast } from "@/lib/api"
import { useTheme } from "@/lib/theme"

interface ChartPoint {
  date: string
  valence?: number
  predicted?: number
  lower?: number
  upper?: number
}

const fmtDate = (d: string) => { const [, m, day] = d.split("-"); return `${parseInt(m)}/${parseInt(day)}` }

function relativeLabel(forecastAvg: number, histMean: number) {
  const diff = forecastAvg - histMean
  const pct = histMean !== 0 ? Math.abs(diff / histMean) : 0
  if (pct < 0.05) return { text: "At your usual level", color: "#94a3b8", arrow: "→" }
  if (diff > 0)   return { text: "Above your average",  color: "#10b981", arrow: "↑" }
  return               { text: "Below your average",  color: "#f87171", arrow: "↓" }
}

function weekTrend(forecast: { valence: number }[]) {
  if (forecast.length < 2) return null
  const diff  = forecast[forecast.length - 1].valence - forecast[0].valence
  const range = Math.max(...forecast.map((f) => f.valence)) - Math.min(...forecast.map((f) => f.valence))
  if (range < 0.005) return { text: "Flat week ahead",        color: "#94a3b8", arrow: "→" }
  if (diff > 0)      return { text: "Rising through the week", color: "#10b981", arrow: "↗" }
  return                    { text: "Dipping through the week", color: "#f87171", arrow: "↘" }
}

export default function MoodForecast() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [chartData, setChartData]   = useState<ChartPoint[]>([])
  const [sparse, setSparse]         = useState(false)
  const [dataPoints, setDataPoints] = useState(0)
  const [relative, setRelative]     = useState<{ text: string; color: string; arrow: string } | null>(null)
  const [trend, setTrend]           = useState<{ text: string; color: string; arrow: string } | null>(null)
  const [yDomain, setYDomain]       = useState<[number, number]>([0, 0.2])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [model, setModel]           = useState<string | null>(null)
  const [mae, setMae]               = useState<number | null>(null)

  useEffect(() => {
    getMoodForecast(7)
      .then((res) => {
        const histSlice = res.history.slice(-14)
        const histPoints: ChartPoint[] = histSlice.map((h, i, arr) => {
          const p: ChartPoint = { date: h.date, valence: h.valence }
          if (i === arr.length - 1) { p.predicted = h.valence; p.lower = h.valence; p.upper = h.valence }
          return p
        })
        const forecastPoints: ChartPoint[] = res.forecast.map((f) => ({
          date: f.date, predicted: f.valence, lower: f.lower, upper: f.upper,
        }))
        const combined = [...histPoints, ...forecastPoints]
        setChartData(combined)

        const allVals = combined.flatMap((d) =>
          [d.valence, d.predicted, d.lower, d.upper].filter((v): v is number => v !== undefined)
        )
        setYDomain([
          parseFloat((Math.max(-1, Math.min(...allVals) - 0.02)).toFixed(3)),
          parseFloat((Math.min(1,  Math.max(...allVals) + 0.04)).toFixed(3)),
        ])

        const fcAvg = res.forecast.reduce((s, f) => s + f.valence, 0) / res.forecast.length
        setRelative(relativeLabel(fcAvg, res.hist_mean))
        setTrend(weekTrend(res.forecast))
        setSparse(res.sparse_data)
        setDataPoints(res.data_points)
        setModel(res.model ?? null)
        setMae(res.backtest_mae ?? null)
      })
      .catch((e: Error) => setError(e.message ?? "Could not load forecast"))
      .finally(() => setLoading(false))
  }, [])

  const axisColor  = isDark ? "#44445a" : "#94a3b8"
  const tooltipBg  = isDark ? "#111118" : "#ffffff"
  const tooltipBdr = isDark ? "#1e1e2a" : "#e2e8f0"
  const areaFill   = isDark ? "url(#confBandDark)" : "url(#confBandLight)"
  const todayStr   = new Date().toISOString().slice(0, 10)

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-4 w-32 bg-slate-100 dark:bg-[#1e1e2a] rounded mb-2" />
        <div className="h-3 w-48 bg-slate-100 dark:bg-[#1e1e2a] rounded mb-6" />
        <div className="h-44 bg-slate-50 dark:bg-[#1a1a22] rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-1">Mood Forecast</h2>
        <p className="text-sm text-slate-400">{error.includes("422") ? "Need at least 3 days of listening history." : "Could not load forecast."}</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Mood Forecast</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Next 7 days · based on {dataPoints} day{dataPoints !== 1 ? "s" : ""} of history
          </p>
        </div>
        {sparse && (
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-full mt-1">
            Limited data
          </span>
        )}
      </div>

      {relative && trend && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {[relative, trend].map((pill, i) => (
            <div key={i}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 border text-xs font-medium"
              style={{ color: pill.color, borderColor: `${pill.color}40`, background: isDark ? `${pill.color}15` : `${pill.color}12` }}
            >
              <span className="text-sm">{pill.arrow}</span>
              {pill.text}
            </div>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="confBandLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="confBandDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={yDomain} tickFormatter={(v: number) => v.toFixed(2)} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 12, fontSize: 12, padding: "8px 12px" }}
            formatter={(val: unknown, name: unknown) => {
              if (name === "upper" || name === "lower") return [null, null]
              const v = typeof val === "number" ? val.toFixed(3) : String(val)
              return [v, name === "valence" ? "History" : "Forecast"]
            }}
            labelFormatter={(d: unknown) => fmtDate(String(d))}
          />
          <ReferenceLine x={todayStr} stroke={isDark ? "#2a2a38" : "#e2e8f0"} strokeDasharray="4 2"
            label={{ value: "today", position: "insideTopRight", fontSize: 9, fill: axisColor, dy: -2 }} />

          <Area dataKey="upper" stroke="none" fill={areaFill}                               legendType="none" connectNulls dot={false} />
          <Area dataKey="lower" stroke="none" fill={isDark ? "#111118" : "#ffffff"}          legendType="none" connectNulls dot={false} />
          <Line dataKey="valence"   stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, fill: "#7c3aed" }} />
          <Line dataKey="predicted" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls activeDot={{ r: 4, fill: "#7c3aed" }} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400 dark:text-slate-600">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-violet-600 rounded" /> History</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-6" style={{ borderTop: "2px dashed #7c3aed", marginTop: 1 }} /> Forecast</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded bg-violet-200 dark:bg-violet-900/40" /> Range</span>
        </div>
        <span className="text-[10px] text-slate-300 dark:text-slate-700">lyrical sentiment score</span>
      </div>

      {(model || mae !== null) && (
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {model && (
            <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#1a1a22] text-slate-400 border border-slate-100 dark:border-[#1e1e2a]">
              model: {model}
            </span>
          )}
          {mae !== null && (
            <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#1a1a22] text-slate-400 border border-slate-100 dark:border-[#1e1e2a]">
              backtest MAE: {mae.toFixed(3)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
