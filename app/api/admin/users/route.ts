import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const BulkUpdateRoleSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
  role:    z.nativeEnum(Role),
})

const UpdateUserAdminSchema = z.object({
  role:              z.nativeEnum(Role).optional(),
  isActive:          z.boolean().optional(),
  name:              z.string().min(1).max(200).optional(),
  title:             z.string().max(200).optional().nullable(),
  department:        z.string().max(200).optional().nullable(),
  mustResetPassword: z.boolean().optional(),
})

const CreateUserAdminSchema = z.object({
  email:             z.string().email(),
  name:              z.string().min(1).max(200),
  role:              z.nativeEnum(Role).optional().default('VIEWER'),
  password:          z.string().min(8),
  title:             z.string().max(200).optional(),
  department:        z.string().max(200).optional(),
  mustResetPassword: z.boolean().optional().default(true),
})

type BulkUpdateRoleInput  = z.infer<typeof BulkUpdateRoleSchema>
type UpdateUserAdminInput = z.infer<typeof UpdateUserAdminSchema>
type CreateUserAdminInput = z.infer<typeof CreateUserAdminSchema>

// ─── Auth guard helper ────────────────────────────────────────────────────────

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: 'Unauthorised', status: 401 } as const
  if (session.user.role !== Role.ADMIN) return { error: 'Forbidden — ADMIN only', status: 403 } as const
  return { session } as const
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(req)
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.status === 401 ? 'UNAUTHORISED' : 'FORBIDDEN' },
      { status: auth.status }
    )
  }

  const { searchParams } = req.nextUrl
  const search     = searchParams.get('search')
  const roleFilter = searchParams.get('role') as Role | null
  const isActive   = searchParams.get('isActive')
  const cursor     = searchParams.get('cursor')
  const limit      = Math.min(Number(searchParams.get('limit') ?? 50), 200)

  try {
    const users = await prisma.user.findMany({
      where: {
        // Only show real login-capable tool users, not resource persons (placeholder emails)
        NOT: { email: { endsWith: '@placeholder.local' } },
        ...(search ? {
          OR: [
            { name:  { contains: search } },
            { email: { contains: search } },
          ],
        } : {}),
        ...(roleFilter  ? { role:     roleFilter }       : {}),
        ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { name: 'asc' },
      select: {
        id:                true,
        email:             true,
        name:              true,
        role:              true,
        title:             true,
        department:        true,
        avatarUrl:         true,
        isActive:          true,
        mustResetPassword: true,
        lastLoginAt:       true,
        createdAt:         true,
        updatedAt:         true,
        _count:            { select: { resourceAllocations: true } },
      },
    })

    const hasMore    = users.length > limit
    const items      = hasMore ? users.slice(0, limit) : users
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({ data: { items, nextCursor } })
  } catch (err) {
    console.error('[GET /api/admin/users]', err)
    return NextResponse.json({ error: 'Failed to fetch users', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/admin/users ────────────────────────────────────────────────────
// Creates a user OR (with ?action=bulk-role) bulk-updates roles

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(req)
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.status === 401 ? 'UNAUTHORISED' : 'FORBIDDEN' },
      { status: auth.status }
    )
  }
  const { session } = auth

  const action = req.nextUrl.searchParams.get('action')

  // ── Bulk role update ────────────────────────────────────────────────────
  if (action === 'bulk-role') {
    let body: BulkUpdateRoleInput
    try {
      body = BulkUpdateRoleSchema.parse(await req.json())
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.user.updateMany({
          where: { id: { in: body.userIds } },
          data:  { role: body.role },
        })

        await tx.appAuditLog.createMany({
          data: body.userIds.map(userId => ({
            userId:     session.user.id,
            action:     'USER_BULK_ROLE_UPDATED',
            entityType: 'User',
            entityId:   userId,
            detail:     JSON.stringify({ role: body.role }),
          })),
        })

        return { updatedCount: body.userIds.length }
      })

      return NextResponse.json({ data: result })
    } catch (err) {
      console.error('[POST /api/admin/users?action=bulk-role]', err)
      return NextResponse.json({ error: 'Bulk role update failed', code: 'BULK_UPDATE_ERROR' }, { status: 500 })
    }
  }

  // ── Create user ─────────────────────────────────────────────────────────
  let body: CreateUserAdminInput
  try {
    body = CreateUserAdminSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A user with that email already exists', code: 'DUPLICATE_EMAIL' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(body.password, 12)

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email:             body.email.toLowerCase().trim(),
          name:              body.name,
          role:              body.role,
          title:             body.title,
          department:        body.department,
          mustResetPassword: body.mustResetPassword,
          passwordHash,
        },
        select: {
          id: true, email: true, name: true, role: true, title: true,
          department: true, isActive: true, mustResetPassword: true, createdAt: true,
        },
      })

      await tx.appAuditLog.create({
        data: {
          userId:     session.user.id,
          action:     'USER_CREATED',
          entityType: 'User',
          entityId:   created.id,
          detail:     JSON.stringify({ email: created.email, role: created.role }),
        },
      })

      return created
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/users]', err)
    return NextResponse.json({ error: 'Failed to create user', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/admin/users?userId= ─────────────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(req)
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.status === 401 ? 'UNAUTHORISED' : 'FORBIDDEN' },
      { status: auth.status }
    )
  }
  const { session } = auth

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account', code: 'SELF_DELETE' }, { status: 409 })
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (existing.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last active admin', code: 'LAST_ADMIN' },
          { status: 409 }
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      // Re-attribute deals created by the deleted user to the deleting admin
      await tx.deal.updateMany({
        where: { createdById: userId },
        data:  { createdById: session.user.id },
      })

      // Remove deal memberships and sensitive-access grants
      await tx.resourceAllocation.deleteMany({ where: { userId } })
      await tx.dealSensitiveAccess.deleteMany({ where: { userId } })

      await tx.appAuditLog.create({
        data: {
          userId:     session.user.id,
          action:     'USER_DELETED',
          entityType: 'User',
          entityId:   userId,
          detail:     JSON.stringify({ email: existing.email, name: existing.name, role: existing.role }),
        },
      })

      // Nullable FK references (tasks, synergy lines, etc.) will be SetNull automatically
      await tx.user.delete({ where: { id: userId } })
    })

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('[DELETE /api/admin/users]', err)
    return NextResponse.json({ error: 'Failed to delete user', code: 'DELETE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/admin/users?userId= ──────────────────────────────────────────

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(req)
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.status === 401 ? 'UNAUTHORISED' : 'FORBIDDEN' },
      { status: auth.status }
    )
  }
  const { session } = auth

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateUserAdminInput
  try {
    body = UpdateUserAdminSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Prevent self-demotion for the only admin
    if (body.role && body.role !== Role.ADMIN && userId === session.user.id) {
      const adminCount = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot change role of the last active admin', code: 'LAST_ADMIN' },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...(body.role              !== undefined ? { role:              body.role }              : {}),
          ...(body.isActive          !== undefined ? { isActive:          body.isActive }          : {}),
          ...(body.name              !== undefined ? { name:              body.name }              : {}),
          ...(body.title             !== undefined ? { title:             body.title }             : {}),
          ...(body.department        !== undefined ? { department:        body.department }        : {}),
          ...(body.mustResetPassword !== undefined ? { mustResetPassword: body.mustResetPassword } : {}),
        },
        select: {
          id: true, email: true, name: true, role: true, title: true,
          department: true, isActive: true, mustResetPassword: true, updatedAt: true,
        },
      })

      await tx.appAuditLog.create({
        data: {
          userId:     session.user.id,
          action:     'USER_UPDATED',
          entityType: 'User',
          entityId:   userId,
          detail:     JSON.stringify({
            from: { role: existing.role, isActive: existing.isActive },
            to:   { role: user.role,     isActive: user.isActive },
          }),
        },
      })

      return user
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/admin/users]', err)
    return NextResponse.json({ error: 'Failed to update user', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}
