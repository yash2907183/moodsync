export const MOOD_THEME = {
  anger: {
    gradient: "from-red-600 via-rose-500 to-pink-500",
    accent: "#ef4444",
    soft: "#fef2f2",
    softDark: "rgba(239,68,68,0.12)",
    emoji: "🔥",
    label: "Intense",
  },
  joy: {
    gradient: "from-amber-400 via-orange-400 to-yellow-300",
    accent: "#f59e0b",
    soft: "#fffbeb",
    softDark: "rgba(245,158,11,0.12)",
    emoji: "✨",
    label: "Joyful",
  },
  sadness: {
    gradient: "from-indigo-600 via-blue-500 to-violet-600",
    accent: "#6366f1",
    soft: "#eef2ff",
    softDark: "rgba(99,102,241,0.12)",
    emoji: "🌧️",
    label: "Melancholic",
  },
  fear: {
    gradient: "from-slate-700 via-slate-600 to-slate-500",
    accent: "#64748b",
    soft: "#f8fafc",
    softDark: "rgba(100,116,139,0.12)",
    emoji: "🌑",
    label: "Anxious",
  },
  optimism: {
    gradient: "from-emerald-500 via-teal-400 to-cyan-400",
    accent: "#10b981",
    soft: "#ecfdf5",
    softDark: "rgba(16,185,129,0.12)",
    emoji: "🌤️",
    label: "Optimistic",
  },
} as const

export type MoodKey = keyof typeof MOOD_THEME
export const getMoodTheme = (mood?: string | null) =>
  MOOD_THEME[(mood as MoodKey) ?? "optimism"] ?? MOOD_THEME.optimism
