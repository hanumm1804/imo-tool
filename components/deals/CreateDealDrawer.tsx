'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { X, ChevronDown, AlertCircle } from 'lucide-react'
import { UserPicker } from '@/components/shared/UserPicker'
import { useToast } from '@/components/shared/Toast'
import { DealStatus } from '@/types'

// ── Schema ────────────────────────────────────────────────────────────────────

const createDealSchema = z.object({
  name:                 z.string().min(1, 'Deal name is required').max(100),
  acquiredCompanyName:  z.string().min(1, 'Acquired company name is required').max(100),
  sector:               z.string().max(80).optional(),
  description:          z.string().max(1000).optional(),
  status:               z.enum(['PRE_CLOSE', 'ACTIVE', 'ON_HOLD'] as const, {
                          required_error: 'Status is required',
                        }),
  acquisitionDate:      z.string().optional(),
  executiveSponsorId:   z.string().optional(),
  imoLeadId:            z.string().min(1, 'IMO Lead is required'),
  revenueSynergyTarget: z.coerce.number().min(0).optional(),
  costSynergyTarget:    z.coerce.number().min(0).optional(),
})

type CreateDealFormValues = z.infer<typeof createDealSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-[var(--status-red)]">
      <AlertCircle className="h-3 w-3" aria-hidden="true" />
      {message}
    </p>
  )
}

function InputLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor:   string
  children:  React.ReactNode
  required?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-gray-700"
    >
      {children}
      {required && (
        <span className="ml-0.5 text-[var(--status-red)]" aria-hidden="true">*</span>
      )}
    </label>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CreateDealDrawerProps {
  open:     boolean
  onClose:  () => void
}

export function CreateDealDrawer({ open, onClose }: CreateDealDrawerProps) {
  const router     = useRouter()
  const { toast }  = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDealFormValues>({
    resolver:      zodResolver(createDealSchema),
    defaultValues: {
      name:                 '',
      acquiredCompanyName:  '',
      sector:               '',
      description:          '',
      status:               'PRE_CLOSE',
      acquisitionDate:      '',
      executiveSponsorId:   '',
      imoLeadId:            '',
      revenueSynergyTarget: undefined,
      costSynergyTarget:    undefined,
    },
  })

  // Reset form when drawer closes
  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  async function onSubmit(values: CreateDealFormValues) {
    try {
      const res = await fetch('/api/deals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(values),
      })

      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to create deal')
      }

      const json = await res.json() as { data: { id: string } }

      toast({
        variant: 'success',
        title:   'Deal created',
        message: `"${values.name}" has been created successfully.`,
      })

      onClose()
      router.push(`/deals/${json.data.id}`)
    } catch (err) {
      toast({
        variant: 'error',
        title:   'Error creating deal',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-[var(--status-red)] focus:ring-[var(--status-red)]/30'
        : 'border-gray-300 focus:border-[var(--fsl-bright-blue)] focus:ring-[var(--fsl-bright-blue)]/20'
    }`

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Slide-over panel */}
        <Dialog.Content
          className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[480px] flex-col bg-white shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
          aria-describedby="create-deal-description"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
                Create New Deal
              </Dialog.Title>
              <p id="create-deal-description" className="mt-0.5 text-xs text-gray-400">
                Fields marked <span aria-hidden="true">*</span><span className="sr-only">with an asterisk</span> are required.
              </p>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close drawer"
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--fsl-bright-blue)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>
          </div>

          {/* Form body — scrollable */}
          <form
            id="create-deal-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex-1 overflow-y-auto px-6 py-5"
          >
            <div className="space-y-5">
              {/* Deal Name */}
              <div>
                <InputLabel htmlFor="deal-name" required>Deal Name</InputLabel>
                <input
                  id="deal-name"
                  type="text"
                  {...register('name')}
                  className={inputClass(!!errors.name)}
                  placeholder="e.g. Acme Corp Integration"
                />
                <FieldError message={errors.name?.message} />
              </div>

              {/* Acquired Company Name */}
              <div>
                <InputLabel htmlFor="deal-acquired-company" required>
                  Acquired Company Name
                </InputLabel>
                <input
                  id="deal-acquired-company"
                  type="text"
                  {...register('acquiredCompanyName')}
                  className={inputClass(!!errors.acquiredCompanyName)}
                  placeholder="e.g. Acme Corporation"
                />
                <FieldError message={errors.acquiredCompanyName?.message} />
              </div>

              {/* Sector */}
              <div>
                <InputLabel htmlFor="deal-sector">Sector</InputLabel>
                <input
                  id="deal-sector"
                  type="text"
                  {...register('sector')}
                  className={inputClass(false)}
                  placeholder="e.g. Financial Services"
                />
              </div>

              {/* Description */}
              <div>
                <InputLabel htmlFor="deal-description">Description</InputLabel>
                <textarea
                  id="deal-description"
                  rows={3}
                  {...register('description')}
                  className={`${inputClass(false)} resize-none`}
                  placeholder="Brief description of this integration…"
                />
              </div>

              {/* Deal Status */}
              <div>
                <InputLabel htmlFor="deal-status" required>Deal Status</InputLabel>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger
                        id="deal-status"
                        aria-invalid={!!errors.status}
                        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                          errors.status
                            ? 'border-[var(--status-red)] focus:ring-[var(--status-red)]/30'
                            : 'border-gray-300 focus:border-[var(--fsl-bright-blue)] focus:ring-[var(--fsl-bright-blue)]/20'
                        }`}
                      >
                        <Select.Value placeholder="Select status…" />
                        <Select.Icon>
                          <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        </Select.Icon>
                      </Select.Trigger>

                      <Select.Portal>
                        <Select.Content
                          position="popper"
                          sideOffset={4}
                          className="z-[60] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
                        >
                          <Select.Viewport className="py-1">
                            {(['PRE_CLOSE', 'ACTIVE', 'ON_HOLD'] as const).map((s) => (
                              <Select.Item
                                key={s}
                                value={s}
                                className="flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none data-[highlighted]:bg-[var(--fsl-gray)]"
                              >
                                <Select.ItemText>
                                  {s === 'PRE_CLOSE' ? 'Pre-Close' : s === 'ACTIVE' ? 'Active' : 'On Hold'}
                                </Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  )}
                />
                <FieldError message={errors.status?.message} />
              </div>

              {/* Acquisition Date */}
              <div>
                <InputLabel htmlFor="deal-acquisition-date">Acquisition Date</InputLabel>
                <input
                  id="deal-acquisition-date"
                  type="date"
                  {...register('acquisitionDate')}
                  className={inputClass(false)}
                />
              </div>

              {/* Executive Sponsor */}
              <div>
                <InputLabel htmlFor="deal-exec-sponsor">Executive Sponsor</InputLabel>
                <Controller
                  name="executiveSponsorId"
                  control={control}
                  render={({ field }) => (
                    <UserPicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select executive sponsor…"
                    />
                  )}
                />
              </div>

              {/* IMO Lead */}
              <div>
                <InputLabel htmlFor="deal-imo-lead" required>IMO Lead</InputLabel>
                <Controller
                  name="imoLeadId"
                  control={control}
                  render={({ field }) => (
                    <UserPicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select IMO lead…"
                    />
                  )}
                />
                <FieldError message={errors.imoLeadId?.message} />
              </div>

              {/* Synergy targets */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InputLabel htmlFor="deal-revenue-synergy">
                    Revenue Synergy $M
                  </InputLabel>
                  <input
                    id="deal-revenue-synergy"
                    type="number"
                    min={0}
                    step={0.1}
                    {...register('revenueSynergyTarget')}
                    className={inputClass(false)}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <InputLabel htmlFor="deal-cost-synergy">
                    Cost Synergy $M
                  </InputLabel>
                  <input
                    id="deal-cost-synergy"
                    type="number"
                    min={0}
                    step={0.1}
                    {...register('costSynergyTarget')}
                    className={inputClass(false)}
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--fsl-bright-blue)] focus:ring-offset-1"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="create-deal-form"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="flex items-center gap-2 rounded-md bg-[var(--fsl-orange)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--fsl-orange)] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating…
                </>
              ) : (
                'Create Deal'
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
