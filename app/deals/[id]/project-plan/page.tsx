'use client'

import { useParams } from 'next/navigation'
import { useTasks } from '@/hooks/useTasks'
import { useDeal } from '@/hooks/useDeal'
import { MSProjectView } from '@/components/deal-detail/ProjectPlan/MSProjectView'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'

export default function ProjectPlanPage() {
  const params  = useParams<{ id: string }>()
  const dealId  = params.id

  const { data: tasks, isLoading } = useTasks(dealId)
  const { data: deal              } = useDeal(dealId)

  if (isLoading) {
    return (
      <div className="h-full p-6">
        <SkeletonLoader variant="gantt" rows={12} />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
      <MSProjectView
        dealId={dealId}
        tasks={tasks ?? []}
        dealName={deal?.name ?? dealId}
      />
    </div>
  )
}
