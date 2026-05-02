"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts"
import type { EmotionDistribution } from "@/types"
import { EMOTION_COLORS, EMOTION_LABELS } from "@/lib/constants"
import { useTheme } from "@/lib/theme"

export default function EmotionBreakdown({ data }: { data: EmotionDistribution | null }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  if (!data) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
        No emotion data yet.
      </div>
    )
  }

  const entries = Object.entries(data).map(([key, value]) => ({
    emotion: EMOTION_LABELS[key] ?? key,
    raw: value,
    color: EMOTION_COLORS[key] ?? "#94a3b8",
  }))

  const max = Math.max(...entries.map((e) => e.raw), 0.01)
  const chartData = entries
    .map((e) => ({ ...e, score: parseFloat(((e.raw / max) * 100).toFixed(1)) }))
    .sort((a, b) => b.score - a.score)

  const mutedText = isDark ? "#4a5568" : "#94a3b8"
  const tooltipBg = isDark ? "#111118" : "#ffffff"
  const tooltipBorder = isDark ? "#1e1e2a" : "#e2e8f0"
  const tooltipText = isDark ? "#e2e8f0" : "#0f172a"
  const cursorFill = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category" dataKey="emotion" width={72}
          tick={{ fill: isDark ? "#64748b" : "#64748b", fontSize: 12 }} tickLine={false} axisLine={false}
        />
        <Tooltip
          contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12, color: tooltipText }}
          formatter={(_v, _n, props) => [`${(props.payload.raw * 100).toFixed(1)}%`, "Score"]}
          cursor={{ fill: cursorFill }}
        />
        <Bar dataKey="score" radius={[0, 6, 6, 0]}
          label={{ position: "right", fontSize: 11, fill: mutedText, formatter: (v: unknown) => `${Number(v).toFixed(0)}%` }}>
          {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
