interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accentColor?: string
}

export default function StatCard({ label, value, sub, accentColor = "#d2bbff" }: StatCardProps) {
  return (
    <div className="bg-surface-container-low border border-outline-variant p-6 rounded-xl h-full flex flex-col justify-between hover:border-primary/40 transition-colors">
      <div>
        <p className="font-geist text-[12px] tracking-widest uppercase text-on-surface-variant mb-2">{label}</p>
        <p className="font-hanken text-[20px] font-semibold" style={{ color: accentColor }}>{value}</p>
      </div>
      {sub && <p className="text-[14px] text-on-surface-variant/60 mt-4">{sub}</p>}
    </div>
  )
}
