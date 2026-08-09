import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const UpdateUserSchema = z.object({
  role:              z.nativeEnum(Role).optional(),
  isActive:          z.boolean().optional(),
  name:              z.string().min(1).max(200).optional(),
  title:             z.string().max(200).optional().nullable(),
  department:        z.string().max(200).optional().nullable(),
  mustResetPassword: z.boolean().optional(),
})

const CreateUserSchema = z.object({
  email:             z.string().email(),
  name:              z.string().min(1).max(200),
  role:              z.nativeEnum(Role).optional().default('VIEWER'),
  password:          z.string().min(8),
  title:             z.string().max(200).optional(),
  department:        z.string().max(200).optional(),
  mustResetPassword: z.boolean().optional().default(true),
})

type UpdateUserInput = z.infer<typeof UpdateUserSchema>
type CreateUserInput = z.infer<typeof CreateUserSchema>

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Accessible to all authenticated users (VIEWER, IMO_LEAD, ADMIN)

export async function GET(
  req: NextRequest
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const search     = searchParams.get('search')
  const roleFilter = searchParams.get('role') as Role | null
  const isActive   = searchParams.get('isActive')
  const loginOnly  = searchParams.get('loginOnly') === 'true'

  try {
    const users = await prisma.user.findMany({
      where: {
        // loginOnly=true filters out placeholder users who cannot log in
        ...(loginOnly ? { NOT: { email: { endsWith: '@placeholder.local' } } } : {}),
        ...(search ? {
          OR: [
            { name:  { contains: search } },
            { email: { contains: search } },
          ],
        } : {}),
        ...(roleFilter ? { role:     roleFilter } : {}),
        ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
      },
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
      },
    })

    return NextResponse.json({ data: users })
  } catch (err) {
    console.error('[GET /api/users]', err)
    return NextResponse.json({ error: 'Failed to fetch users', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/users — invite / create user ───────────────────────────────────

export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden — ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: CreateUserInput
  try {
    body = CreateUserSchema.parse(await req.json())
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
    console.error('[POST /api/users]', err)
    return NextResponse.json({ error: 'Failed to create user', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/users?userId= ─────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden — ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
  }

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateUserInput
  try {
    body = UpdateUserSchema.parse(await req.json())
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
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      })
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
    console.error('[PATCH /api/users]', err)
    return NextResponse.json({ error: 'Failed to update user', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}
