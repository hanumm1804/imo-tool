import { z } from 'zod'

export const CreateTaskSchema = z.object({
  workstreamId: z.string().cuid(),
  parentId:     z.string().cuid().optional().nullable(),
  title:        z.string().min(1).max(500),
  description:  z.string().max(2000).optional().nullable(),
  ownerId:      z.string().cuid().optional().nullable(),
  startDate:    z.string().datetime().optional().nullable(),
  endDate:      z.string().datetime().optional().nullable(),
  durationDays: z.number().int().positive().optional().nullable(),
  percentDone:  z.number().int().min(0).max(100).default(0),
  status:       z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED']).default('NOT_STARTED'),
  rag:          z.enum(['GREEN', 'AMBER', 'RED', 'GRAY']).default('GRAY'),
  priority:     z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  phaseNumber:  z.number().int().min(1).max(6).optional().nullable(),
  dependsOnId:  z.string().cuid().optional().nullable(),
})

export const UpdateTaskSchema = CreateTaskSchema.partial().omit({ workstreamId: true })

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
