import { z } from 'zod'

export const CreateActionSchema = z.object({
  title:        z.string().min(1).max(500),
  description:  z.string().max(2000).optional().nullable(),
  ownerId:      z.string().cuid().optional().nullable(),
  workstreamId: z.string().cuid().optional().nullable(),
  dueDate:      z.string().datetime().optional().nullable(),
  priority:     z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  status:       z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).default('OPEN'),
})

export const UpdateActionSchema = CreateActionSchema.partial()

export const CreateRiskSchema = z.object({
  description:  z.string().min(1).max(2000),
  workstreamId: z.string().cuid().optional().nullable(),
  likelihood:   z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  impact:       z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  mitigation:   z.string().max(2000).optional().nullable(),
  ownerId:      z.string().cuid().optional().nullable(),
  status:       z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).default('OPEN'),
})

export const UpdateRiskSchema = CreateRiskSchema.partial()

export const CreateDecisionSchema = z.object({
  title:           z.string().min(1).max(500),
  context:         z.string().max(2000).optional().nullable(),
  decisionMade:    z.string().min(1).max(5000),
  decisionMakerId: z.string().cuid().optional().nullable(),
  decidedAt:       z.string().datetime().optional().nullable(),
  rationale:       z.string().max(2000).optional().nullable(),
  impactWorkstream: z.string().max(200).optional().nullable(),
})

export const UpdateDecisionSchema = CreateDecisionSchema.partial()

export const CreateRAIDSchema = z.object({
  type:         z.enum(['RISK', 'ACTION', 'ISSUE', 'DEPENDENCY']),
  title:        z.string().min(1).max(500),
  description:  z.string().max(2000).optional().nullable(),
  ownerId:      z.string().cuid().optional().nullable(),
  workstreamId: z.string().cuid().optional().nullable(),
  dueDate:      z.string().datetime().optional().nullable(),
  priority:     z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  status:       z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).default('OPEN'),
})

export const UpdateRAIDSchema = CreateRAIDSchema.partial()

export type CreateActionInput   = z.infer<typeof CreateActionSchema>
export type UpdateActionInput   = z.infer<typeof UpdateActionSchema>
export type CreateRiskInput     = z.infer<typeof CreateRiskSchema>
export type UpdateRiskInput     = z.infer<typeof UpdateRiskSchema>
export type CreateDecisionInput = z.infer<typeof CreateDecisionSchema>
export type UpdateDecisionInput = z.infer<typeof UpdateDecisionSchema>
export type CreateRAIDInput     = z.infer<typeof CreateRAIDSchema>
export type UpdateRAIDInput     = z.infer<typeof UpdateRAIDSchema>
