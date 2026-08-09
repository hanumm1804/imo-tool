'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id:          string
  email:       string
  name:        string
  role:        'ADMIN' | 'IMO_LEAD' | 'VIEWER'
  avatarUrl:   string | null
  isActive:    boolean
  lastLoginAt: string | null
  createdAt:   string
  updatedAt:   string
  _count:      { resourceAllocations: number }
}

export interface AppSetting {
  id:          string
  key:         string
  value:       string
  description?: string | null
  updatedAt:   string
  updatedBy:   { id: string; name: string } | null
}

export interface AuditLogItem {
  id:          string
  userId:      string | null
  userName:    string | null
  action:      string
  entityType:  string
  entityId:    string | null
  detail:      string | null
  oldValue?:   string | null
  newValue?:   string | null
  createdAt:   string
  user:        { id: string; name: string; email: string } | null
}

export type AdminUserRole = 'ADMIN' | 'IMO_LEAD' | 'VIEWER'

// ─── Users ────────────────────────────────────────────────────────────────────

export function useAdminUsers(search?: string, role?: AdminUserRole | 'ALL') {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (role && role !== 'ALL') params.set('role', role)
  params.set('limit', '200')

  return useQuery({
    queryKey: ['admin', 'users', search, role],
    queryFn: async (): Promise<AdminUser[]> => {
      const res  = await fetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const json = await res.json() as { data?: { items?: AdminUser[] } }
      return json.data?.items ?? []
    },
    staleTime: 30_000,
  })
}

export function useCreateAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      email:    string
      name:     string
      role:     AdminUserRole
      password: string
    }): Promise<AdminUser> => {
      const res = await fetch('/api/admin/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json() as { data?: AdminUser; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to create user')
      return json.data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useUpdateAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      body,
    }: {
      userId: string
      body:   { role?: AdminUserRole; isActive?: boolean; name?: string }
    }): Promise<AdminUser> => {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json() as { data?: AdminUser; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to update user')
      return json.data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useDeleteAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete user')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useBulkUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userIds,
      role,
    }: {
      userIds: string[]
      role:    AdminUserRole
    }): Promise<{ updatedCount: number }> => {
      const res = await fetch('/api/admin/users?action=bulk-role', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userIds, role }),
      })
      const json = await res.json() as { data?: { updatedCount: number }; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Bulk update failed')
      return json.data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function useAppSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async (): Promise<AppSetting[]> => {
      const res  = await fetch('/api/admin/settings')
      if (!res.ok) throw new Error('Failed to fetch settings')
      const json = await res.json() as { data?: AppSetting[] }
      return json.data ?? []
    },
    staleTime: 60_000,
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }): Promise<AppSetting> => {
      const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ value }),
      })
      const json = await res.json() as { data?: AppSetting; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to update setting')
      return json.data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  })
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export function useAuditLog(filters?: {
  userId?:     string
  action?:     string
  entityType?: string
  dateFrom?:   string
  dateTo?:     string
}) {
  const params = new URLSearchParams()
  if (filters?.userId)     params.set('userId',     filters.userId)
  if (filters?.action)     params.set('action',     filters.action)
  if (filters?.entityType) params.set('entityType', filters.entityType)
  if (filters?.dateFrom)   params.set('dateFrom',   filters.dateFrom)
  if (filters?.dateTo)     params.set('dateTo',     filters.dateTo)
  params.set('limit', '100')

  return useQuery({
    queryKey: ['admin', 'audit', filters],
    queryFn: async (): Promise<AuditLogItem[]> => {
      const res  = await fetch(`/api/admin/audit?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch audit log')
      const json = await res.json() as { data?: { items?: AuditLogItem[] } }
      return json.data?.items ?? []
    },
    staleTime: 15_000,
  })
}
