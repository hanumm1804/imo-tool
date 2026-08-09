'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SynergyCategory, RevenueBucket, BenefitsFunnelStage, SynergyStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SynergyOwner {
  id:        string
  name:      string
  avatarUrl: string | null
}

/**
 * Shape returned by GET /api/deals/[id]/synergy
 * Prisma Decimal fields are serialised as numbers in JSON.
 */
export interface SynergyLineWithRelations {
  id:                  string
  dealId:              string
  title:               string
  category:            SynergyCategory
  revenueBucket:       RevenueBucket | null
  ownerId:             string | null
  owner:               SynergyOwner | null
  baselineUSD:         number
  committedUSD:        number
  realisedUSD:         number
  status:              SynergyStatus
  benefitsFunnelStage: BenefitsFunnelStage
  financeValidated:    boolean
  notes:               string | null
  createdAt:           string
  updatedAt:           string
}

export interface SynergySummary {
  totalBaseline:  number
  totalCommitted: number
  totalRealised:  number
  variancePct:    number
}

export interface CreateSynergyInput {
  title:               string
  category:            SynergyCategory
  revenueBucket?:      RevenueBucket
  ownerId?:            string
  baselineUSD?:        number
  committedUSD?:       number
  realisedUSD?:        number
  benefitsFunnelStage?: BenefitsFunnelStage
  status?:             SynergyStatus
  notes?:              string
}

export interface UpdateSynergyInput {
  title?:               string
  ownerId?:             string | null
  baselineUSD?:         number
  committedUSD?:        number
  realisedUSD?:         number
  benefitsFunnelStage?: BenefitsFunnelStage
  status?:              SynergyStatus
  notes?:               string | null
  financeValidated?:    boolean
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export interface DealSynergySummary {
  dealId:                  string
  totalBaseline:           number
  totalCommitted:          number
  totalRealised:           number
  headcountReduced:        number
  headcountPeopleExpense:  number
  headcountOtherExpense:   number
}

/** Fetches synergy totals for every deal in a single request — used by the Reports page. */
export function useCrossDealSynergy() {
  return useQuery({
    queryKey: ['synergy-summary-all'],
    queryFn: async (): Promise<Record<string, DealSynergySummary>> => {
      const res = await fetch('/api/reports/synergy-summary')
      if (!res.ok) throw new Error('Failed to fetch synergy summaries')
      const json = await res.json() as { data?: DealSynergySummary[]; error?: string }
      if (json.error) throw new Error(json.error)
      const items = json.data ?? []
      return Object.fromEntries(items.map((item) => [item.dealId, item]))
    },
    staleTime: 30_000,
  })
}

export function useSynergyLines(dealId: string) {
  return useQuery({
    queryKey: ['synergy', dealId],
    queryFn: async (): Promise<SynergyLineWithRelations[]> => {
      const res = await fetch(`/api/deals/${dealId}/synergy`)
      if (!res.ok) throw new Error('Failed to fetch synergy lines')
      const json = await res.json() as { data?: { lines?: SynergyLineWithRelations[] }; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data?.lines ?? []
    },
    staleTime: 30_000,
  })
}

/** Alias used by synergy-tracker page */
export const useSynergy = useSynergyLines

export function useCreateSynergyLine(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateSynergyInput): Promise<SynergyLineWithRelations> => {
      const res = await fetch(`/api/deals/${dealId}/synergy`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create synergy line')
      }
      return ((await res.json()) as { data: SynergyLineWithRelations }).data
    },
    onSuccess: async (newLine) => {
      qc.setQueryData<SynergyLineWithRelations[]>(
        ['synergy', dealId],
        (old) => [...(old ?? []), newLine],
      )
      await qc.invalidateQueries({ queryKey: ['synergy', dealId] })
      void qc.invalidateQueries({ queryKey: ['synergy-summary-all'] })
    },
  })
}

export function useUpdateSynergyLine(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lineId, body }: { lineId: string; body: UpdateSynergyInput }): Promise<SynergyLineWithRelations> => {
      const res = await fetch(`/api/deals/${dealId}/synergy?synergyId=${lineId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update synergy line')
      }
      return ((await res.json()) as { data: SynergyLineWithRelations }).data
    },
    onSuccess: async (updatedLine) => {
      qc.setQueryData<SynergyLineWithRelations[]>(
        ['synergy', dealId],
        (old) => (old ?? []).map((l) => l.id === updatedLine.id ? updatedLine : l),
      )
      await qc.invalidateQueries({ queryKey: ['synergy', dealId] })
      void qc.invalidateQueries({ queryKey: ['synergy-summary-all'] })
    },
  })
}

export function useDeleteSynergyLine(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lineId: string): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/synergy?synergyId=${lineId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to delete synergy line')
      }
    },
    onSuccess: async (_data, lineId) => {
      qc.setQueryData<SynergyLineWithRelations[]>(
        ['synergy', dealId],
        (old) => (old ?? []).filter((l) => l.id !== lineId),
      )
      await qc.invalidateQueries({ queryKey: ['synergy', dealId] })
      void qc.invalidateQueries({ queryKey: ['synergy-summary-all'] })
    },
  })
}
