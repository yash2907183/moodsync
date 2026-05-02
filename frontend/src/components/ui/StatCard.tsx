interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accentColor?: string
}

export default function StatCard({ label, value, sub, accentColor = "#7c3aed" }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-[#111118] border border-slate-200 dark:border-[#1e1e2a] rounded-2xl p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <div className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-300" style={{ backgroundColor: accentColor }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" style={{ background: `radial-gradient(ellipse at top left, ${accentColor}08 0%, transparent 70%)` }} />
      <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color: accentColor }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}
