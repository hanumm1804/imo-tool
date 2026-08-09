import { z } from 'zod'

export const CreateDealSchema = z.object({
  name:                    z.string().min(2).max(200),
  acquiredCompanyName:     z.string().min(2).max(200),
  sector:                  z.string().max(100).optional(),
  description:             z.string().max(2000).optional(),
  status:                  z.enum(['PRE_CLOSE', 'ACTIVE', 'ON_HOLD', 'CLOSED', 'CANCELLED']).default('PRE_CLOSE'),
  acquisitionDate:         z.string().datetime().optional().nullable(),
  execSponsorId:           z.string().cuid().optional().nullable(),
  imoLeadId:               z.string().cuid().optional().nullable(),
  revenueSynergyTargetUSD: z.number().positive().optional().nullable(),
  costSynergyTargetUSD:    z.number().positive().optional().nullable(),
})

export const UpdateDealSchema = CreateDealSchema.partial()

export const UpdateCharterSchema = z.object({
  revenueSynergyTargetUSD: z.number().positive().optional().nullable(),
  costSynergyTargetUSD:    z.number().positive().optional().nullable(),
  ebitdaTarget12m:         z.number().positive().optional().nullable(),
  ebitdaTarget24m:         z.number().positive().optional().nullable(),
  valueRealisationLead:    z.string().max(200).optional().nullable(),
  techLead:                z.string().max(200).optional().nullable(),
  changeCommsLead:         z.string().max(200).optional().nullable(),
  execSteerCoCadence:      z.string().max(500).optional().nullable(),
  workingSteerCoCadence:   z.string().max(500).optional().nullable(),
  integrationPrinciples:   z.string().max(5000).optional().nullable(),
})

export const UpdateNarrativeSchema = z.object({
  fieldKey: z.enum(['valuationAndDealStructure', 'dueDiligence']),
  content:  z.string(),
})

export type CreateDealInput   = z.infer<typeof CreateDealSchema>
export type UpdateDealInput   = z.infer<typeof UpdateDealSchema>
export type UpdateCharterInput = z.infer<typeof UpdateCharterSchema>
export type UpdateNarrativeInput = z.infer<typeof UpdateNarrativeSchema>
