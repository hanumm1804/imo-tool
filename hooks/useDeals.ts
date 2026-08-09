'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DealStatus, RAGStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DealListItem {
  id:                  string
  name:                string
  acquiredCompanyName: string
  sector:              string | null
  status:              DealStatus
  overallRag:          RAGStatus
  currentPhase:        number
  description:         string | null
  acquisitionDate:     string | null
  isSensitive:         boolean
  updatedAt:           string
  createdAt:           string
  createdBy: {
    id:        string
    name:      string
    avatarUrl: string | null
  }
  imoLead: {
    id:        string
    name:      string
    avatarUrl: string | null
  } | null
  execSponsor: {
    id:   string
    name: string
  } | null
  projectStartDate: string | null
  projectEndDate:   string | null
  _count: {
    tasks:               number
    resourceAllocations: number
    riskEntries:         number
    actionEntries:       number
  }
}

export interface DealsFilters {
  status?:  DealStatus
  search?:  string
  sortBy?:  'name' | 'createdAt' | 'updatedAt' | 'overallRag'
}

export interface CreateDealInput {
  name:                    string
  acquiredCompanyName:     string
  sector?:                 string
  description?:            string
  status?:                 DealStatus
  acquisitionDate?:        string
  imoLeadId?:              string
  execSponsorId?:          string
  isSensitive?:            boolean
  revenueSynergyTargetUSD?: number
  costSynergyTargetUSD?:   number
}

export interface UpdateDealInput {
  name?:               string
  acquiredCompanyName?: string
  sector?:             string
  description?:        string
  status?:             DealStatus
  overallRag?:         RAGStatus
  currentPhase?:       number
  acquisitionDate?:    string | null
  closedDate?:         string | null
  isSensitive?:        boolean
  imoLeadId?:          string | null
  execSponsorId?:      string | null
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDeals(filters?: DealsFilters) {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.sortBy) params.set('sortBy', filters.sortBy)

  return useQuery({
    queryKey: ['deals', filters],
    queryFn: async (): Promise<DealListItem[]> => {
      const res = await fetch(`/api/deals?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch deals')
      const json = await res.json() as { data?: { items?: DealListItem[] }; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data?.items ?? []
    },
    staleTime: 30_000,
  })
}

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateDealInput): Promise<DealListItem> => {
      const res = await fetch('/api/deals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create deal')
      }
      return ((await res.json()) as { data: DealListItem }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useUpdateDeal(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateDealInput): Promise<DealListItem> => {
      const res = await fetch(`/api/deals/${dealId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update deal')
      }
      return ((await res.json()) as { data: DealListItem }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['deal', dealId] })
    },
  })
}
