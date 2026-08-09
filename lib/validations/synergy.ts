import { z } from 'zod'

export const CreateSynergyLineSchema = z.object({
  title:               z.string().min(1).max(500),
  category:            z.enum(['COST', 'REVENUE']),
  revenueBucket:       z.enum(['BUCKET_A', 'BUCKET_B', 'BUCKET_C']).optional().nullable(),
  ownerId:             z.string().cuid().optional().nullable(),
  baselineUSD:         z.number().min(0).default(0),
  committedUSD:        z.number().min(0).default(0),
  realisedUSD:         z.number().min(0).default(0),
  status:              z.enum(['ON_TRACK', 'WATCH', 'AT_RISK']).default('WATCH'),
  benefitsFunnelStage: z.enum(['IDENTIFIED', 'COMMITTED', 'REALISED']).default('IDENTIFIED'),
  financeValidated:    z.boolean().default(false),
  notes:               z.string().max(2000).optional().nullable(),
})

export const UpdateSynergyLineSchema = CreateSynergyLineSchema.partial()

export type CreateSynergyLineInput = z.infer<typeof CreateSynergyLineSchema>
export type UpdateSynergyLineInput = z.infer<typeof UpdateSynergyLineSchema>
