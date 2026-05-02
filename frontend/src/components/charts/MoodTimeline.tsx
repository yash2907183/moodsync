"use client"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts"
import type { TimelinePoint } from "@/types"
import { VALENCE_COLOR, ENERGY_COLOR } from "@/lib/constants"
import { useTheme } from "@/lib/theme"

export default function MoodTimeline({ data }: { data: TimelinePoint[] }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
        No timeline data yet. Sync your Spotify and run the backfill script.
      </div>
    )
  }

  const allVals = data.flatMap((d) => [d.valence, d.energy])
  const yMin = Math.max(-1, Math.min(...allVals) - 0.1)
  const yMax = Math.min(1, Math.max(...allVals) + 0.1)

  const gridColor  = isDark ? "#1e1e2a" : "#f1f5f9"
  const axisColor  = isDark ? "#44445a" : "#94a3b8"
  const tooltipBg  = isDark ? "#111118" : "#ffffff"
  const tooltipBdr = isDark ? "#1e1e2a" : "#e2e8f0"

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          domain={[parseFloat(yMin.toFixed(1)), parseFloat(yMax.toFixed(1))]}
          tick={{ fill: axisColor, fontSize: 11 }}
          tickLine={false} axisLine={false}
          width={42}
          tickFormatter={(v: number) => v.toFixed(1)}
        />
        <ReferenceLine y={0} stroke={isDark ? "#2a2a38" : "#e2e8f0"} strokeDasharray="4 4" />
        <Tooltip
          contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 12, fontSize: 12, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
          labelStyle={{ color: isDark ? "#e2e8f0" : "#0f172a", marginBottom: 4 }}
          itemStyle={{ color: isDark ? "#94a3b8" : "#64748b" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: axisColor, paddingTop: 16 }} />
        <Line type="monotone" dataKey="valence" stroke={VALENCE_COLOR} strokeWidth={2} dot={false} name="Valence" activeDot={{ r: 4, fill: VALENCE_COLOR }} />
        <Line type="monotone" dataKey="energy"  stroke={ENERGY_COLOR}  strokeWidth={2} dot={false} name="Energy"  activeDot={{ r: 4, fill: ENERGY_COLOR }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
