'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import {
  Deal, DealPhase, TollgateItem, Workstream, PreAcquisitionLens,
  ResourceAllocation, IntegrationCharter,
  DealStatus, RAGStatus, PhaseStatus, Role,
} from '@/types'

// ─── Extended types returned by GET /api/deals/[id] ──────────────────────────

export type TollgateWithUser = TollgateItem

export interface PhaseWithTollgates extends DealPhase {
  tollgateItems: TollgateWithUser[]
}

export interface WorkstreamWithOwner extends Workstream {
  fslLead: { id: string; name: string; avatarUrl: string | null } | null
}

export interface ResourceWithUser extends ResourceAllocation {
  user:       { id: string; name: string; email: string; avatarUrl: string | null }
  workstream: { id: string; name: string; code: string } | null
}

export interface SensitiveAccessEntry {
  id:         string
  userId:     string
  grantedAt:  string
  user:       { id: string; name: string; email: string }
  grantedBy:  { id: string; name: string }
}

export interface DealCreatedBy {
  id:        string
  name:      string
  email:     string
  avatarUrl: string | null
  role:      Role
}

export interface DealDetail extends Deal {
  createdBy:           DealCreatedBy
  sensitiveAccessList: SensitiveAccessEntry[]
  charter:             IntegrationCharter | null
  narrative:           NarrativeData | null
  phases:              PhaseWithTollgates[]
  workstreams:         WorkstreamWithOwner[]
  lensAssessments:     PreAcquisitionLens[]
  resourceAllocations: ResourceWithUser[]
  _count: {
    tasks:           number
    riskEntries:     number
    actionEntries:   number
    decisionEntries: number
    raidEntries:     number
    synergyLines:    number
  }
}

export interface NarrativeData {
  valuationAndDealStructure: string | null
  dueDiligence:              string | null
}

// ─── Charter update types ────────────────────────────────────────────────────

export interface UpdateCharterInput {
  revenueSynergyTargetUSD?: number | null
  costSynergyTargetUSD?:    number | null
  ebitdaTarget12m?:         number | null
  ebitdaTarget24m?:         number | null
  valueRealisationLead?:    string | null
  techLead?:                string | null
  changeCommsLead?:         string | null
  execSteerCoCadence?:      string | null
  workingSteerCoCadence?:   string | null
  integrationPrinciples?:   string | null
}

// ─── Narrative update types ──────────────────────────────────────────────────

export type NarrativeFieldKey = 'valuationAndDealStructure' | 'dueDiligence'

export interface UpdateNarrativeInput {
  fieldKey: NarrativeFieldKey
  content:  string
}

// ─── Phase signoff types ─────────────────────────────────────────────────────

export interface SignoffPhaseInput {
  phaseId:    string
  itemIds:    string[]
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDeal(dealId: string) {
  return useQuery({
    queryKey: ['deal', dealId],
    queryFn: async (): Promise<DealDetail> => {
      const res = await fetch(`/api/deals/${dealId}`)
      if (!res.ok) throw new Error('Failed to fetch deal')
      const json = await res.json() as { data?: DealDetail; error?: string }
      if (json.error) throw new Error(json.error)
      if (!json.data) throw new Error('No data returned')
      return json.data
    },
    staleTime: 30_000,
  })
}

export function useDealPhases(dealId: string) {
  return useQuery({
    queryKey: ['deal-phases', dealId],
    queryFn: async (): Promise<PhaseWithTollgates[]> => {
      const res = await fetch(`/api/deals/${dealId}/phases`)
      if (!res.ok) throw new Error('Failed to fetch phases')
      const json = await res.json() as { data?: PhaseWithTollgates[]; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useDealCharter(dealId: string) {
  return useQuery({
    queryKey: ['deal-charter', dealId],
    queryFn: async (): Promise<IntegrationCharter | null> => {
      const res = await fetch(`/api/deals/${dealId}/charter`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error('Failed to fetch charter')
      const json = await res.json() as { data?: IntegrationCharter; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? null
    },
    staleTime: 60_000,
  })
}

export function useDealNarrative(dealId: string) {
  return useQuery({
    queryKey: ['deal-narrative', dealId],
    queryFn: async (): Promise<NarrativeData> => {
      const res = await fetch(`/api/deals/${dealId}/narrative`)
      if (!res.ok) throw new Error('Failed to fetch narrative')
      const json = await res.json() as { data?: NarrativeData; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? { valuationAndDealStructure: null, dueDiligence: null }
    },
    staleTime: 30_000,
  })
}

export function useUpdateCharter(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateCharterInput): Promise<IntegrationCharter> => {
      const res = await fetch(`/api/deals/${dealId}/charter`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update charter')
      }
      return ((await res.json()) as { data: IntegrationCharter }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-charter', dealId] })
      qc.invalidateQueries({ queryKey: ['deal', dealId] })
    },
  })
}

export function useSignoffCharter(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<IntegrationCharter> => {
      const res = await fetch(`/api/deals/${dealId}/charter?action=signoff`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    '{}',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to sign off charter')
      }
      return ((await res.json()) as { data: IntegrationCharter }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-charter', dealId] })
      qc.invalidateQueries({ queryKey: ['deal', dealId] })
    },
  })
}

export function useUnlockCharter(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<IntegrationCharter> => {
      const res = await fetch(`/api/deals/${dealId}/charter?action=unlock`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    '{}',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to unlock charter')
      }
      return ((await res.json()) as { data: IntegrationCharter }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-charter', dealId] })
      qc.invalidateQueries({ queryKey: ['deal', dealId] })
    },
  })
}

/** Debounced narrative update — 2 s debounce via timer ref */
export function useUpdateNarrative(dealId: string) {
  const qc      = useQueryClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mutation = useMutation({
    mutationFn: async (body: UpdateNarrativeInput): Promise<NarrativeData> => {
      const res = await fetch(`/api/deals/${dealId}/narrative`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update narrative')
      }
      return ((await res.json()) as { data: NarrativeData }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-narrative', dealId] })
    },
  })

  function debouncedMutate(input: UpdateNarrativeInput) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => mutation.mutate(input), 2_000)
  }

  return { ...mutation, debouncedMutate }
}

export function useSignoffTollgate(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: SignoffPhaseInput): Promise<PhaseWithTollgates> => {
      const res = await fetch(`/api/deals/${dealId}/phases?action=signoff&phaseId=${body.phaseId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    '{}',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to sign off tollgate')
      }
      return ((await res.json()) as { data: PhaseWithTollgates }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-phases', dealId] })
      qc.invalidateQueries({ queryKey: ['deal', dealId] })
    },
  })
}
