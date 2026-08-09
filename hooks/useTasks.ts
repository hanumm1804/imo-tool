'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Task, RAGStatus, TaskStatus, Priority } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskOwner {
  id:        string
  name:      string
  avatarUrl: string | null
}

export interface TaskWorkstream {
  id:   string
  name: string
  code: string
}

export interface TaskChildSummary {
  id:     string
  title:  string
  status: TaskStatus
  rag:    RAGStatus
  level:  number
}

export interface TaskWithRelations extends Task {
  owner:     TaskOwner | null
  workstream: TaskWorkstream
  children:  TaskChildSummary[]
  _count:    { children: number }
}

export interface CreateTaskInput {
  workstreamId:  string
  parentId?:     string | null
  level:         1 | 2 | 3
  title:         string
  description?:  string
  status?:       TaskStatus
  rag?:          RAGStatus
  priority?:     Priority
  ownerId?:      string | null
  startDate?:    string | null
  endDate?:      string | null
  durationDays?: number | null
  percentDone?:  number
  dependsOnId?:  string | null
  sortOrder?:    number
}

export interface UpdateTaskInput {
  title?:        string
  description?:  string
  status?:       TaskStatus
  rag?:          RAGStatus
  priority?:     Priority
  ownerId?:      string | null
  startDate?:    string | null
  endDate?:      string | null
  durationDays?: number | null
  percentDone?:  number
  dependsOnId?:  string | null
  parentId?:     string | null
  level?:        number
  wbsNumber?:    string | null
  completedAt?:  string | null
  sortOrder?:    number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useTasks(dealId: string, workstreamId?: string) {
  const params = new URLSearchParams()
  if (workstreamId) params.set('workstreamId', workstreamId)
  params.set('limit', '500')

  return useQuery({
    queryKey: ['tasks', dealId, workstreamId],
    queryFn: async (): Promise<TaskWithRelations[]> => {
      const res = await fetch(`/api/deals/${dealId}/tasks?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const json = await res.json() as { data?: { items?: TaskWithRelations[] }; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data?.items ?? []
    },
    staleTime: 30_000,
  })
}

export function useCreateTask(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateTaskInput): Promise<Task> => {
      const res = await fetch(`/api/deals/${dealId}/tasks`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create task')
      }
      return ((await res.json()) as { data: Task }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', dealId] })
    },
  })
}

export function useUpdateTask(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: UpdateTaskInput }): Promise<Task> => {
      const res = await fetch(`/api/deals/${dealId}/tasks?taskId=${taskId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update task')
      }
      return ((await res.json()) as { data: Task }).data
    },
    // Optimistic update for RAG changes
    onMutate: async ({ taskId, body }) => {
      if (body.rag === undefined) return

      await qc.cancelQueries({ queryKey: ['tasks', dealId] })

      const previous = qc.getQueryData<{ items: TaskWithRelations[] }>(['tasks', dealId])

      if (previous?.items) {
        qc.setQueryData(['tasks', dealId], {
          ...previous,
          items: previous.items.map((t) =>
            t.id === taskId ? { ...t, rag: body.rag! } : t
          ),
        })
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['tasks', dealId], context.previous)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', dealId] })
    },
  })
}

export function useDeleteTask(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/tasks?taskId=${taskId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to delete task')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', dealId] })
    },
  })
}
