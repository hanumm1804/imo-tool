interface SkeletonLoaderProps {
  variant: 'card' | 'table' | 'text' | 'gantt'
  rows?:   number
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--fsl-gray)] ${className}`}
      aria-hidden="true"
    />
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/5" />
          <SkeletonBlock className="h-3 w-2/5" />
        </div>
        <SkeletonBlock className="h-8 w-8 rounded-md" />
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonBlock className="h-8 w-1/3" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-5 w-16 rounded-full" />
          <SkeletonBlock className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-6 gap-4 border-b border-gray-200 bg-[var(--fsl-dark-blue)] px-4 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3 w-full opacity-30" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className={`grid grid-cols-6 gap-4 px-4 py-3 ${rowIdx % 2 === 1 ? 'bg-[var(--fsl-gray)]' : 'bg-white'}`}
        >
          {Array.from({ length: 6 }).map((_, colIdx) => (
            <SkeletonBlock
              key={colIdx}
              className={`h-4 ${colIdx === 0 ? 'w-4/5' : colIdx === 5 ? 'w-2/5' : 'w-3/5'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function TextSkeleton({ rows }: { rows: number }) {
  const widths = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3', 'w-1/2']

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={`h-4 ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  )
}

function GanttSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => {
        const indented   = i % 3 !== 0
        const barWidth   = 40 + ((i * 17) % 40)
        const barOffset  = (i * 11) % 30

        return (
          <div key={i} className="flex items-center gap-3">
            {/* Label column */}
            <div
              className={`flex-shrink-0 ${indented ? 'pl-6' : ''}`}
              style={{ width: 200 }}
            >
              <SkeletonBlock
                className={`h-4 ${indented ? 'w-3/4' : 'w-4/5'}`}
              />
            </div>
            {/* Bar column */}
            <div className="relative flex-1 h-6">
              <div
                className="absolute top-1 h-4 rounded animate-pulse bg-[var(--fsl-gray)]"
                style={{
                  left:  `${barOffset}%`,
                  width: `${barWidth}%`,
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SkeletonLoader({ variant, rows = 5 }: SkeletonLoaderProps) {
  if (variant === 'card') {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Loading content"
        aria-busy="true"
      >
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div aria-label="Loading table" aria-busy="true">
        <TableSkeleton rows={rows} />
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div aria-label="Loading content" aria-busy="true">
        <TextSkeleton rows={rows} />
      </div>
    )
  }

  // gantt
  return (
    <div aria-label="Loading Gantt chart" aria-busy="true">
      <GanttSkeleton rows={rows} />
    </div>
  )
}
