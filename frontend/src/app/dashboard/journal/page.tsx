"use client"
import MoodCheckinCard from "@/components/dashboard/MoodCheckin"

export default function JournalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Journal</h1>
        <p className="text-sm text-slate-400 mt-0.5">Rate your mood daily and see how it compares to your listening</p>
      </div>
      <MoodCheckinCard />
    </div>
  )
}
