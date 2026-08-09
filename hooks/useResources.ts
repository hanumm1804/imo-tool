'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ResourceAllocation } from '@/types'

// ─── PersonStat ───────────────────────────────────────────────────────────────
// Shared shape for the people tasks table + bar chart (deal-level & cross-deal)
export interface PersonStat {
  userId:          string
  name:            string
  totalTasks:      number
  redTasks:        number
  amberTasks:      number
  greenTasks:      number
  completedTasks:  number
  notStartedTasks: number
  // exclusive bar-chart buckets (sum to totalTasks)
  barRed:          number
  barAmber:        number
  barGreen:        number
  barCompleted:    number
  barNotStarted:   number
  barOther:        number
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResourceUser {
  id:        string
  name:      string
  email:     string
  avatarUrl: string | null
}

export interface ResourceWorkstream {
  id:   string
  name: string
  code: string
}

export interface ResourceWithRelations extends ResourceAllocation {
  user:       ResourceUser
  workstream: ResourceWorkstream | null
}

export interface CreateResourceInput {
  userId:           string
  workstreamId?:    string
  roleDescription?: string
  allocationPct?:   number
  startDate?:       string
  endDate?:         string
}

export interface UpdateResourceInput {
  workstreamId?:    string | null
  roleDescription?: string | null
  allocationPct?:   number
  startDate?:       string | null
  endDate?:         string | null
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useResources(dealId: string) {
  return useQuery({
    queryKey: ['resources', dealId],
    queryFn: async (): Promise<ResourceWithRelations[]> => {
      const res = await fetch(`/api/deals/${dealId}/resources`)
      if (!res.ok) throw new Error('Failed to fetch resources')
      const json = await res.json() as { data?: ResourceWithRelations[]; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useCreateResource(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateResourceInput): Promise<ResourceAllocation> => {
      const res = await fetch(`/api/deals/${dealId}/resources`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to add resource')
      }
      return ((await res.json()) as { data: ResourceAllocation }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources', dealId] })
    },
  })
}

export function useUpdateResource(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ resourceId, body }: { resourceId: string; body: UpdateResourceInput }): Promise<ResourceAllocation> => {
      const res = await fetch(`/api/deals/${dealId}/resources?resourceId=${resourceId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update resource')
      }
      return ((await res.json()) as { data: ResourceAllocation }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources', dealId] })
    },
  })
}

export function useQuickAddResource(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<{ id: string; name: string }> => {
      const res = await fetch(`/api/deals/${dealId}/resources/quick-add`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to add resource')
      }
      return ((await res.json()) as { data: { id: string; name: string } }).data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['resources', dealId] })
    },
  })
}

export function useDeleteResource(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (resourceId: string): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/resources?resourceId=${resourceId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to remove resource')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources', dealId] })
    },
  })
}

// ─── Universal user pool ──────────────────────────────────────────────────────

export interface UserOption {
  id:    string
  name:  string
  email: string
  role:  string
}

export function useAllUsers() {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: async (): Promise<UserOption[]> => {
      const res = await fetch('/api/users?isActive=true&loginOnly=true')
      if (!res.ok) throw new Error('Failed to fetch users')
      const json = await res.json() as { data?: UserOption[]; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? []
    },
    staleTime: 60_000,
  })
}

export function useQuickCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<{ id: string; name: string }> => {
      const res = await fetch('/api/users/quick-create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create person')
      }
      return ((await res.json()) as { data: { id: string; name: string } }).data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['allUsers'] })
    },
  })
}

// ─── Build Team ───────────────────────────────────────────────────────────────

export interface TeamMember {
  id:        string
  createdAt: string
  user: {
    id:            string
    name:          string
    email:         string
    role:          string
    isDealTeamOnly: boolean
    isActive:      boolean
  }
}

export function useDealTeam(dealId: string) {
  return useQuery({
    queryKey: ['deal-team', dealId],
    queryFn: async (): Promise<TeamMember[]> => {
      const res = await fetch(`/api/deals/${dealId}/team`)
      if (!res.ok) throw new Error('Failed to fetch team')
      const json = await res.json() as { data?: TeamMember[]; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useAddToTeam(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string): Promise<{ allocationId: string }> => {
      const res = await fetch(`/api/deals/${dealId}/team`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'add-existing', userId }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to add team member')
      }
      return ((await res.json()) as { data: { allocationId: string } }).data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['deal-team', dealId] })
      void qc.invalidateQueries({ queryKey: ['resources', dealId] })
    },
  })
}

export function useInviteToTeam(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; email: string; password: string }): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/team`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'create-new', ...body }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create team member')
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['deal-team', dealId] })
      void qc.invalidateQueries({ queryKey: ['resources', dealId] })
    },
  })
}

export function useRemoveFromTeam(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (allocationId: string): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/team?allocationId=${allocationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to remove team member')
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['deal-team', dealId] })
      void qc.invalidateQueries({ queryKey: ['resources', dealId] })
    },
  })
}

export function useCrossDealResources() {
  return useQuery({
    queryKey: ['cross-deal-resources'],
    queryFn: async (): Promise<PersonStat[]> => {
      const res = await fetch('/api/reports/resources')
      if (!res.ok) throw new Error('Failed to fetch cross-deal resource stats')
      const json = await res.json() as { data?: { people: PersonStat[] }; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data?.people ?? []
    },
    staleTime: 30_000,
  })
}
