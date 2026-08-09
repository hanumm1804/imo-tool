'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PreAcquisitionLens, LensStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LensReviewer {
  id:        string
  name:      string
  avatarUrl: string | null
}

export interface LensWithReviewer extends PreAcquisitionLens {
  assessedBy: LensReviewer | null
}

export interface UpdateLensInput {
  status?:                  LensStatus
  notes?:                   string | null
  benchmarks?:              string
  assessedAt?:              string | null
  strategicOverrideActive?: boolean
  overrideNotes?:           string | null
  boardSignOffDate?:        string | null
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLenses(dealId: string) {
  return useQuery({
    queryKey: ['lenses', dealId],
    queryFn: async (): Promise<LensWithReviewer[]> => {
      const res = await fetch(`/api/deals/${dealId}/lenses`)
      if (!res.ok) throw new Error('Failed to fetch lenses')
      const json = await res.json() as { data?: LensWithReviewer[]; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? []
    },
    staleTime: 60_000,
  })
}

export function useUpdateLens(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lensId, body }: { lensId: string; body: UpdateLensInput }): Promise<PreAcquisitionLens> => {
      const res = await fetch(`/api/deals/${dealId}/lenses?lensId=${lensId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update lens')
      }
      return ((await res.json()) as { data: PreAcquisitionLens }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lenses', dealId] })
      qc.invalidateQueries({ queryKey: ['deal', dealId] })
    },
  })
}
