interface Track {
  track_id: string
  name: string
  artist: string | string[]
  plays: number
}

export default function TopTracksList({ tracks }: { tracks: Track[] }) {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
        No listening history yet.
      </div>
    )
  }

  const maxPlays = Math.max(...tracks.map((t) => t.plays))

  return (
    <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
      {tracks.map((track, i) => (
        <div
          key={track.track_id}
          className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#1a1a22] rounded-xl border border-slate-100 dark:border-[#2a2a38] hover:border-slate-300 dark:hover:border-[#3a3a4a] hover:bg-white dark:hover:bg-[#1f1f28] transition-all group"
        >
          <span className="text-xs font-mono text-slate-300 dark:text-slate-600 w-4 flex-shrink-0 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">{track.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {Array.isArray(track.artist) ? track.artist.join(", ") : track.artist}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-16 h-1 bg-slate-200 dark:bg-[#2a2a38] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(track.plays / maxPlays) * 100}%`,
                  backgroundColor: "#7c3aed",
                }}
              />
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 w-8 text-right">{track.plays}×</span>
          </div>
        </div>
      ))}
    </div>
  )
}
