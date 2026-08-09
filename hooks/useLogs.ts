'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ActionEntry, LogStatus, Priority, RiskLevel } from '@/types'

// ─── Action types ─────────────────────────────────────────────────────────────

export interface ActionOwner { id: string; name: string; avatarUrl: string | null }

export interface ActionWithRelations extends ActionEntry {
  owner:     ActionOwner | null
  createdBy: { id: string; name: string }
}

export interface CreateActionInput {
  title:        string
  description?: string
  ownerId?:     string
  dueDate?:     string
  status?:      LogStatus
  priority?:    Priority
}

export interface UpdateActionInput {
  title?:       string
  description?: string | null
  ownerId?:     string | null
  dueDate?:     string | null
  closedAt?:    string | null
  status?:      LogStatus
  priority?:    Priority
}

// ─── Risk types ───────────────────────────────────────────────────────────────

/**
 * Standalone type (does NOT extend RiskEntry) — RiskEntry uses RiskLevel enum
 * for likelihood/impact and has no `title` field. The API serialises these as
 * enum strings; riskScore is an integer computed server-side.
 */
export interface RiskWithRelations {
  id:          string
  dealId:      string
  workstreamId: string | null
  description: string
  likelihood:  RiskLevel
  impact:      RiskLevel
  riskScore:   number
  mitigation:  string | null
  ownerId:     string | null
  owner:       ActionOwner | null
  status:      LogStatus
  createdAt:   string
  updatedAt:   string
}

export interface CreateRiskInput {
  description:  string
  workstreamId?: string
  likelihood?:  RiskLevel
  impact?:      RiskLevel
  mitigation?:  string
  ownerId?:     string
  status?:      LogStatus
}

export interface UpdateRiskInput {
  description?:  string
  workstreamId?: string | null
  likelihood?:   RiskLevel
  impact?:       RiskLevel
  mitigation?:   string | null
  ownerId?:      string | null
  status?:       LogStatus
}

// ─── Decision types ───────────────────────────────────────────────────────────

/**
 * Standalone type (does NOT extend DecisionEntry) — DecisionEntry has no
 * status, reviewDate, description (uses context + decisionMade), and the
 * decision-maker relation is decisionMaker/decisionMakerId.
 */
export interface DecisionWithRelations {
  id:              string
  dealId:          string
  title:           string
  context:         string | null
  decisionMade:    string
  decisionMakerId: string | null
  decisionMaker:   ActionOwner | null
  decidedAt:       string | null
  rationale:       string | null
  impactWorkstream: string | null
  createdAt:       string
  updatedAt:       string
}

export interface CreateDecisionInput {
  title:             string
  context?:          string
  decisionMade:      string
  decisionMakerId?:  string
  decidedAt?:        string
  rationale?:        string
  impactWorkstream?: string
}

export interface UpdateDecisionInput {
  title?:             string
  context?:           string | null
  decisionMade?:      string
  decisionMakerId?:   string | null
  decidedAt?:         string | null
  rationale?:         string | null
  impactWorkstream?:  string | null
}

// ─── Action hooks ─────────────────────────────────────────────────────────────

export function useActions(dealId: string, filters?: { status?: LogStatus; ownerId?: string; priority?: Priority }) {
  const params = new URLSearchParams()
  if (filters?.status)   params.set('status',   filters.status)
  if (filters?.ownerId)  params.set('ownerId',  filters.ownerId)
  if (filters?.priority) params.set('priority', filters.priority)

  return useQuery({
    queryKey: ['actions', dealId, filters],
    queryFn: async (): Promise<ActionWithRelations[]> => {
      const res = await fetch(`/api/deals/${dealId}/actions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch actions')
      const json = await res.json() as { data?: ActionWithRelations[]; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useCreateAction(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateActionInput): Promise<ActionEntry> => {
      const res = await fetch(`/api/deals/${dealId}/actions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create action')
      }
      return ((await res.json()) as { data: ActionEntry }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions', dealId] })
    },
  })
}

export function useUpdateAction(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ actionId, body }: { actionId: string; body: UpdateActionInput }): Promise<ActionEntry> => {
      const res = await fetch(`/api/deals/${dealId}/actions?actionId=${actionId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update action')
      }
      return ((await res.json()) as { data: ActionEntry }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions', dealId] })
    },
  })
}

export function useDeleteAction(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (actionId: string): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/actions?actionId=${actionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to delete action')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions', dealId] })
    },
  })
}

// ─── Risk hooks ───────────────────────────────────────────────────────────────

export function useRisks(dealId: string, filters?: { status?: LogStatus; likelihood?: RiskLevel; impact?: RiskLevel }) {
  const params = new URLSearchParams()
  if (filters?.status)     params.set('status',     filters.status)
  if (filters?.likelihood) params.set('likelihood', filters.likelihood)
  if (filters?.impact)     params.set('impact',     filters.impact)

  return useQuery({
    queryKey: ['risks', dealId, filters],
    queryFn: async (): Promise<RiskWithRelations[]> => {
      const res = await fetch(`/api/deals/${dealId}/risks?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch risks')
      const json = await res.json() as { data?: RiskWithRelations[]; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useCreateRisk(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateRiskInput): Promise<RiskWithRelations> => {
      const res = await fetch(`/api/deals/${dealId}/risks`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create risk')
      }
      return ((await res.json()) as { data: RiskWithRelations }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks', dealId] })
    },
  })
}

export function useUpdateRisk(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ riskId, body }: { riskId: string; body: UpdateRiskInput }): Promise<RiskWithRelations> => {
      const res = await fetch(`/api/deals/${dealId}/risks?riskId=${riskId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update risk')
      }
      return ((await res.json()) as { data: RiskWithRelations }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks', dealId] })
    },
  })
}

export function useDeleteRisk(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (riskId: string): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/risks?riskId=${riskId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to delete risk')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks', dealId] })
    },
  })
}

// ─── Decision hooks ───────────────────────────────────────────────────────────

export function useDecisions(dealId: string) {
  return useQuery({
    queryKey: ['decisions', dealId],
    queryFn: async (): Promise<DecisionWithRelations[]> => {
      const res = await fetch(`/api/deals/${dealId}/decisions`)
      if (!res.ok) throw new Error('Failed to fetch decisions')
      const json = await res.json() as { data?: DecisionWithRelations[]; error?: string }
      if (json.error) throw new Error(json.error)
      return json.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useCreateDecision(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateDecisionInput): Promise<DecisionWithRelations> => {
      const res = await fetch(`/api/deals/${dealId}/decisions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create decision')
      }
      return ((await res.json()) as { data: DecisionWithRelations }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisions', dealId] })
    },
  })
}

export function useUpdateDecision(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ decisionId, body }: { decisionId: string; body: UpdateDecisionInput }): Promise<DecisionWithRelations> => {
      const res = await fetch(`/api/deals/${dealId}/decisions?decisionId=${decisionId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to update decision')
      }
      return ((await res.json()) as { data: DecisionWithRelations }).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisions', dealId] })
    },
  })
}

export function useDeleteDecision(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (decisionId: string): Promise<void> => {
      const res = await fetch(`/api/deals/${dealId}/decisions?decisionId=${decisionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to delete decision')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisions', dealId] })
    },
  })
}
