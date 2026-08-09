'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Workstream, RAGStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkstreamOwner {
  id:        string
  name:      string
  avatarUrl: string | null
}

export interface WorkstreamWithOwner extends Workstream {
  fslLead: WorkstreamOwner | null
}

export interface CreateWorkstreamInput {
  code:         string
  name:         string
  description?: string
  fslLeadId?:   string
  sortOrder?:   number
}

export interface UpdateWorkstreamInput {
  name?:        string
  description?: string
  fslLeadId?:   string | null
  isActive?:    boolean
  rag?:         RAGStatus
  sortOrder?:   number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWorkstreams(dealId: string) {
  return useQuery({
    queryKey: ['workstreams', dealId],
    queryFn: async (): Promise<WorkstreamWithOwner[]> => {
      const res = await fetch(`/api/deals/${dealId}/workstreams`)
      if (!res.ok) throw new Error('Failed to fetch workstreams')
      const json = await res.json() as { data?: WorkstreamWithOwner[]; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? []
    },
    staleTime: 60_000,
  })
}

export function useCreateWorkstream(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateWorkstreamInput): Promise<Workstream> => {
      const res = await fetch(`/api/deals/${dealId}/workstreams`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create workstream')
      }
      return ((await res.json()) as { data: Workstream }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workstreams', dealId] })
    },
  })
}

export function useUpdateWorkstream(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ workstreamId, body }: { workstreamId: string; body: UpdateWorkstreamInput }): Promise<Workstream> => {
      const res = await fetch(`/api/deals/${dealId}/workstreams?workstreamId=${workstreamId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update workstream')
      }
      return ((await res.json()) as { data: Workstream }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workstreams', dealId] })
      qc.invalidateQueries({ queryKey: ['deal', dealId] })
    },
  })
}

export function useDeleteWorkstream(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (workstreamId: string): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/workstreams?workstreamId=${workstreamId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to delete workstream')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workstreams', dealId] })
    },
  })
}
