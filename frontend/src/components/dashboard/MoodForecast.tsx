"use client"
import { useEffect, useState } from "react"
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts"
import { getMoodForecast } from "@/lib/api"

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
  const pct  = histMean !== 0 ? Math.abs(diff / histMean) : 0
  if (pct < 0.05) return { text: "At your usual level", color: "#ccc3d8", arrow: "→" }
  if (diff > 0)   return { text: "Above your average",  color: "#d2bbff", arrow: "↑" }
  return               { text: "Below your average",  color: "#ffb4ab", arrow: "↓" }
}

function weekTrend(forecast: { valence: number }[]) {
  if (forecast.length < 2) return null
  const diff  = forecast[forecast.length - 1].valence - forecast[0].valence
  const range = Math.max(...forecast.map((f) => f.valence)) - Math.min(...forecast.map((f) => f.valence))
  if (range < 0.005) return { text: "Flat week ahead",         color: "#ccc3d8", arrow: "→" }
  if (diff > 0)      return { text: "Rising through the week", color: "#d2bbff", arrow: "↗" }
  return                    { text: "Dipping through the week", color: "#ffb4ab", arrow: "↘" }
}

export default function MoodForecast() {
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

  const axisColor = "#4a4455"
  const todayStr  = new Date().toISOString().slice(0, 10)

  if (loading) return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-6 animate-pulse">
      <div className="h-5 w-36 bg-surface-variant rounded mb-2" />
      <div className="h-4 w-52 bg-surface-variant rounded mb-6" />
      <div className="h-44 bg-surface-container-high rounded-xl" />
    </div>
  )

  if (error) return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
      <h2 className="font-hanken text-[20px] font-semibold text-on-surface mb-2">Mood Forecast</h2>
      <p className="text-[14px] text-on-surface-variant">
        {error.includes("422") ? "Need at least 3 days of listening history." : "Could not load forecast."}
      </p>
    </div>
  )

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-hanken text-[20px] font-semibold text-on-surface">Mood Forecast</h2>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Next 7 days · based on {dataPoints} day{dataPoints !== 1 ? "s" : ""} of history
          </p>
        </div>
        {sparse && (
          <span className="font-geist text-[10px] tracking-wider uppercase text-tertiary bg-tertiary/10 border border-tertiary/30 px-2 py-0.5 rounded-full mt-1">
            Limited data
          </span>
        )}
      </div>

      {relative && trend && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {[relative, trend].map((pill, i) => (
            <div key={i}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 border font-geist text-[12px] tracking-wider uppercase"
              style={{ color: pill.color, borderColor: `${pill.color}40`, background: `${pill.color}15` }}
            >
              <span className="text-sm">{pill.arrow}</span>
              {pill.text}
            </div>
          ))}
        </div>
      )}

      <div className="chart-grid rounded-lg overflow-hidden">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={yDomain} tickFormatter={(v: number) => v.toFixed(2)} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={52} />
            <Tooltip
              contentStyle={{ background: "#1e1e2b", border: "1px solid #4a4455", borderRadius: 12, fontSize: 12 }}
              formatter={(val: unknown, name: unknown) => {
                if (name === "upper" || name === "lower") return [null, null]
                const v = typeof val === "number" ? val.toFixed(3) : String(val)
                return [v, name === "valence" ? "History" : "Forecast"]
              }}
              labelFormatter={(d: unknown) => fmtDate(String(d))}
            />
            <ReferenceLine x={todayStr} stroke="#4a4455" strokeDasharray="4 2"
              label={{ value: "TODAY", position: "insideTopRight", fontSize: 9, fill: "#d2bbff", dy: -4 }} />
            <Area dataKey="upper" stroke="none" fill="url(#confBand)"   legendType="none" connectNulls dot={false} />
            <Area dataKey="lower" stroke="none" fill="#1e1e2b"           legendType="none" connectNulls dot={false} />
            <Line dataKey="valence"   stroke="#d2bbff" strokeWidth={2.5} dot={false} connectNulls activeDot={{ r: 4, fill: "#d2bbff" }} />
            <Line dataKey="predicted" stroke="#d2bbff" strokeWidth={2.5} strokeDasharray="5 3" dot={false} connectNulls activeDot={{ r: 4, fill: "#d2bbff" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between text-[12px] text-on-surface-variant">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 bg-primary rounded" /> History
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6" style={{ borderTop: "2px dashed #d2bbff", marginTop: 1 }} /> Forecast
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-3 rounded bg-primary-container/40" /> Range
          </span>
        </div>
        <span className="font-geist text-[10px] text-on-surface-variant/40 uppercase tracking-wider">lyrical sentiment</span>
      </div>

      {(model || mae !== null) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {model && (
            <span className="font-geist text-[10px] px-2 py-1 rounded-lg bg-surface-container-high text-on-surface-variant border border-outline-variant">
              model: {model}
            </span>
          )}
          {mae !== null && (
            <span className="font-geist text-[10px] px-2 py-1 rounded-lg bg-surface-container-high text-on-surface-variant border border-outline-variant">
              backtest MAE: {mae.toFixed(3)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
