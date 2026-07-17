export default function ProgressBar({
  position, total, sectionLabel,
}: {
  /** 0-based index of the current item. */
  position: number
  total: number
  sectionLabel: string
}) {
  const pct = Math.round((position / total) * 100)
  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between text-sm text-slate-600">
        <span className="font-medium text-slate-800">{sectionLabel}</span>
        <span>
          Item {position + 1} of {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={position}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Item ${position + 1} of ${total}`}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
