'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeadcountLine {
  id:               string
  dealId:           string
  department:       string
  headcountReduced: number
  peopleExpenseUSD: number
  otherExpenseUSD:  number
  notes:            string | null
  sortOrder:        number
  createdAt:        string
  updatedAt:        string
}

export interface HeadcountData {
  lines: HeadcountLine[]
  notes: string | null
}

export interface CreateHeadcountInput {
  department:       string
  headcountReduced: number
  peopleExpenseUSD: number
  otherExpenseUSD:  number
  notes?:           string | null
}

export type UpdateHeadcountInput = Partial<CreateHeadcountInput>

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useHeadcount(dealId: string) {
  return useQuery({
    queryKey: ['headcount', dealId],
    queryFn: async (): Promise<HeadcountData> => {
      const res = await fetch(`/api/deals/${dealId}/headcount`)
      if (!res.ok) throw new Error('Failed to fetch headcount')
      const json = await res.json() as { data?: HeadcountData; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? { lines: [], notes: null }
    },
    staleTime: 30_000,
  })
}

export function useCreateHeadcountLine(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateHeadcountInput): Promise<HeadcountLine> => {
      const res = await fetch(`/api/deals/${dealId}/headcount`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create line')
      }
      return ((await res.json()) as { data: HeadcountLine }).data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['headcount', dealId] })
      void qc.invalidateQueries({ queryKey: ['synergy-summary-all'] })
    },
  })
}

export function useUpdateHeadcountLine(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lineId, body }: { lineId: string; body: UpdateHeadcountInput }): Promise<HeadcountLine> => {
      const res = await fetch(`/api/deals/${dealId}/headcount?lineId=${lineId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update line')
      }
      return ((await res.json()) as { data: HeadcountLine }).data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['headcount', dealId] })
      void qc.invalidateQueries({ queryKey: ['synergy-summary-all'] })
    },
  })
}

export function useUpdateHeadcountNotes(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (headcountNotes: string | null): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/headcount`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ headcountNotes }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update notes')
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['headcount', dealId] }),
  })
}

export function useDeleteHeadcountLine(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lineId: string): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/headcount?lineId=${lineId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to delete line')
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['headcount', dealId] })
      void qc.invalidateQueries({ queryKey: ['synergy-summary-all'] })
    },
  })
}
