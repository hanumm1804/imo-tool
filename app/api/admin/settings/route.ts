import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const UpdateSettingSchema = z.object({
  value: z.string(),
})

type UpdateSettingInput = z.infer<typeof UpdateSettingSchema>

// ─── GET /api/admin/settings ──────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden — ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const settings = await prisma.appSetting.findMany({
      orderBy: { key: 'asc' },
    })

    return NextResponse.json({ data: settings })
  } catch (err) {
    console.error('[GET /api/admin/settings]', err)
    return NextResponse.json({ error: 'Failed to fetch settings', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/admin/settings?key= ──────────────────────────────────────────

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden — ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
  }

  const key = req.nextUrl.searchParams.get('key')
  if (!key) {
    return NextResponse.json({ error: 'key query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateSettingInput
  try {
    body = UpdateSettingSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.appSetting.findUnique({ where: { key } })
    if (!existing) {
      return NextResponse.json({ error: `Setting with key '${key}' not found`, code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const setting = await tx.appSetting.update({
        where: { key },
        data: {
          value:       body.value,
          updatedById: session.user.id,
        },
      })

      await tx.appAuditLog.create({
        data: {
          userId:     session.user.id,
          action:     'SETTING_UPDATED',
          entityType: 'AppSetting',
          entityId:   setting.id,
          detail:     JSON.stringify({ key, from: existing.value, to: body.value }),
        },
      })

      return setting
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/admin/settings]', err)
    return NextResponse.json({ error: 'Failed to update setting', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/admin/settings — create new setting ───────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden — ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
  }

  const CreateSettingSchema = z.object({
    key:   z.string().min(1).max(100),
    value: z.string(),
  })

  let body: z.infer<typeof CreateSettingSchema>
  try {
    body = CreateSettingSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.appSetting.findUnique({ where: { key: body.key } })
    if (existing) {
      return NextResponse.json(
        { error: `Setting with key '${body.key}' already exists — use PATCH to update`, code: 'DUPLICATE_KEY' },
        { status: 409 }
      )
    }

    const setting = await prisma.$transaction(async (tx) => {
      const created = await tx.appSetting.create({
        data: {
          key:         body.key,
          value:       body.value,
          updatedById: session.user.id,
        },
      })

      await tx.appAuditLog.create({
        data: {
          userId:     session.user.id,
          action:     'SETTING_CREATED',
          entityType: 'AppSetting',
          entityId:   created.id,
          detail:     JSON.stringify({ key: body.key, value: body.value }),
        },
      })

      return created
    })

    return NextResponse.json({ data: setting }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/settings]', err)
    return NextResponse.json({ error: 'Failed to create setting', code: 'CREATE_ERROR' }, { status: 500 })
  }
}
