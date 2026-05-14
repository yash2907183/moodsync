"use client"
import MoodCheckinCard from "@/components/dashboard/MoodCheckin"

export default function JournalPage() {
  return (
    <div>
      <header className="mb-6 md:mb-12">
        <h1 className="font-hanken text-[24px] md:text-[32px] font-semibold leading-tight tracking-[-0.01em] text-on-surface">Journal</h1>
        <p className="text-sm md:text-base text-on-surface-variant mt-1">Rate your mood daily and see how it compares to your listening.</p>
      </header>
      <MoodCheckinCard />
    </div>
  )
}
