'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Save, RotateCcw } from 'lucide-react'
import { useAppSettings, useUpdateSetting } from '@/hooks/useAdmin'
import type { AppSetting } from '@/hooks/useAdmin'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'

// ─── Setting Row ──────────────────────────────────────────────────────────────

function SettingRow({ setting }: { setting: AppSetting }) {
  const updateSetting = useUpdateSetting()
  const [value,    setValue]    = useState(setting.value)
  const [isDirty,  setIsDirty]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    setValue(setting.value)
    setIsDirty(false)
  }, [setting.value])

  function handleChange(v: string) {
    setValue(v)
    setIsDirty(v !== setting.value)
    setSuccess(false)
  }

  async function handleSave() {
    await updateSetting.mutateAsync({ key: setting.key, value })
    setIsDirty(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  function handleReset() {
    setValue(setting.value)
    setIsDirty(false)
    setSuccess(false)
  }

  // Detect boolean settings
  const isBool = value === 'true' || value === 'false'
  // Detect multiline
  const isMultiline = value.length > 80 || value.includes('\n')

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-[var(--fsl-dark-blue)]">
              {setting.key}
            </code>
            {success && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                Saved
              </span>
            )}
          </div>
          {setting.description && (
            <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
          )}

          {/* Input */}
          {isBool ? (
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={value === 'true'}
                  onChange={(e) => handleChange(e.target.checked ? 'true' : 'false')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--fsl-dark-blue)]" />
              </label>
              <span className="text-sm text-gray-700">{value === 'true' ? 'Enabled' : 'Disabled'}</span>
            </div>
          ) : isMultiline ? (
            <textarea
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          )}

          {setting.updatedAt && (
            <p className="mt-1.5 text-[10px] text-gray-400">
              Last updated {format(new Date(setting.updatedAt), 'dd MMM yyyy HH:mm')}
              {setting.updatedBy && ` by ${setting.updatedBy.name}`}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-6 flex-shrink-0">
          {isDirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || updateSetting.isPending}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isDirty
                ? 'bg-[var(--fsl-orange)] text-white hover:opacity-90'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            } disabled:opacity-50`}
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {updateSetting.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useAppSettings()

  if (isLoading) {
    return (
      <div className="px-6 py-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} variant="card" />
        ))}
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">App Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Configure global settings. Changes take effect immediately.
        </p>
      </div>

      {(settings ?? []).length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-400">No settings found. Seed the database with default settings to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(settings ?? []).map((s) => (
            <SettingRow key={s.id} setting={s} />
          ))}
        </div>
      )}
    </div>
  )
}
