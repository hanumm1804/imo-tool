import { prisma } from '@/lib/prisma'
import { RAGStatus } from '@/types'

function calculateRag(rags: RAGStatus[]): RAGStatus {
  if (rags.includes('RED'))   return 'RED'
  if (rags.includes('AMBER')) return 'AMBER'
  if (rags.includes('GREEN')) return 'GREEN'
  return 'GRAY'
}

export async function recalculateWorkstreamRag(workstreamId: string): Promise<RAGStatus> {
  const tasks = await prisma.task.findMany({
    where: { workstreamId },
    select: { rag: true },
  })
  return calculateRag(tasks.map(t => t.rag as RAGStatus))
}

export async function recalculateDealRag(dealId: string): Promise<RAGStatus> {
  const workstreams = await prisma.workstream.findMany({
    where: { dealId, isActive: true },
    select: { rag: true },
  })
  return calculateRag(workstreams.map(w => w.rag as RAGStatus))
}

export async function cascadeRagUpdate(
  taskId: string,
  newRag: RAGStatus
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id: taskId },
      data: { rag: newRag },
    })

    const wsTasks = await tx.task.findMany({
      where: { workstreamId: task.workstreamId },
      select: { rag: true },
    })
    const wsRag = calculateRag(wsTasks.map(t => t.rag as RAGStatus))

    await tx.workstream.update({
      where: { id: task.workstreamId },
      data: { rag: wsRag },
    })

    const dealWorkstreams = await tx.workstream.findMany({
      where: { dealId: task.dealId, isActive: true },
      select: { rag: true },
    })
    const dealRag = calculateRag(dealWorkstreams.map(w => w.rag as RAGStatus))

    await tx.deal.update({
      where: { id: task.dealId },
      data: { overallRag: dealRag },
    })
  })
}
