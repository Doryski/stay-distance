import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Check, MapPin, Pencil, Plus, X } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { revalidateLogic, useForm } from "@tanstack/react-form"
import { z } from "zod"
import { useOrigins, useSelectedOrigins } from "../hooks/useActiveOrigin"
import { addOrigin, moveOrigin, removeOrigin } from "../storage/origins"
import { sendMessage } from "../messaging/client"
import { MESSAGE_KIND } from "../messaging/protocol"
import { ORIGIN_LIMITS } from "../storage/schema"
import type { Origin } from "../types"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Separator } from "../../components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip"

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `o_${Date.now()}_${Math.random()}`

const normalizeAddress = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()

const buildOriginFormSchema = (origins: Origin[], editingId: string | null) =>
  z.object({
    label: z
      .string()
      .trim()
      .min(1, "Label is required")
      .max(
        ORIGIN_LIMITS.labelMax,
        `Label must be ${ORIGIN_LIMITS.labelMax} characters or less`
      )
      .refine(
        (value) =>
          !origins.some(
            (o) =>
              o.id !== editingId &&
              o.label.toLowerCase().trim() === value.toLowerCase().trim()
          ),
        { message: "A place with this label already exists" }
      ),
    address: z
      .string()
      .trim()
      .min(
        ORIGIN_LIMITS.addressMin,
        `Address must be at least ${ORIGIN_LIMITS.addressMin} characters`
      )
      .max(ORIGIN_LIMITS.addressMax, "Address is too long")
      .refine(
        (value) =>
          !origins.some(
            (o) =>
              o.id !== editingId &&
              normalizeAddress(o.address) === normalizeAddress(value)
          ),
        { message: "Another place already uses this address" }
      ),
  })

type FormMode = { kind: "hidden" } | { kind: "add" } | { kind: "edit"; origin: Origin }

const errorMessage = (err: unknown): string =>
  typeof err === "string"
    ? err
    : err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err)

export const OriginManager = () => {
  const [origins] = useOrigins()
  const { selectedIds, setSelected, toggle } = useSelectedOrigins()
  const [mode, setMode] = useState<FormMode>({ kind: "hidden" })
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [open, setOpen] = useState(origins.length === 0)

  const editingId = mode.kind === "edit" ? mode.origin.id : null
  const schema = useMemo(
    () => buildOriginFormSchema(origins, editingId),
    [origins, editingId]
  )

  const saveMutation = useMutation({
    mutationFn: async (input: {
      label: string
      address: string
      existing: Origin | null
    }) => {
      const addressChanged = !input.existing || input.existing.address !== input.address
      const coords = addressChanged
        ? (
            await sendMessage({
              kind: MESSAGE_KIND.geocode,
              address: input.address,
            })
          ).coords
        : input.existing!.coords
      const next: Origin = {
        id: input.existing?.id ?? makeId(),
        label: input.label,
        address: input.address,
        coords,
        createdAt: input.existing?.createdAt ?? Date.now(),
      }
      await addOrigin(next)
      return next
    },
  })

  const form = useForm({
    defaultValues: { label: "", address: "" },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: schema,
    },
    onSubmit: ({ value, formApi }) => {
      saveMutation.mutate(
        {
          label: value.label.trim(),
          address: value.address.trim(),
          existing: mode.kind === "edit" ? mode.origin : null,
        },
        {
          onSuccess: (saved) => {
            setMode({ kind: "hidden" })
            formApi.setFieldValue("label", "")
            formApi.setFieldValue("address", "")
            if (mode.kind === "add" && !selectedIds.includes(saved.id)) {
              void setSelected([...selectedIds, saved.id])
            }
          },
        }
      )
    },
  })

  const resetForm = () => {
    setMode({ kind: "hidden" })
    saveMutation.reset()
    form.setFieldValue("label", "")
    form.setFieldValue("address", "")
  }

  const startAdd = () => {
    saveMutation.reset()
    form.setFieldValue("label", "")
    form.setFieldValue("address", "")
    setMode({ kind: "add" })
  }

  const startEdit = (origin: Origin) => {
    saveMutation.reset()
    form.setFieldValue("label", origin.label)
    form.setFieldValue("address", origin.address)
    setMode({ kind: "edit", origin })
  }

  const busy = saveMutation.isPending
  const serverError = saveMutation.error
    ? saveMutation.error instanceof Error
      ? saveMutation.error.message
      : String(saveMutation.error)
    : null

  const isEditing = mode.kind === "edit"
  const formVisible = mode.kind !== "hidden"
  const atCap = origins.length >= ORIGIN_LIMITS.maxOrigins
  const addDisabled = atCap

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <span className="flex items-center gap-2">
          <MapPin className="size-4 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold tracking-tight">Your places</h2>
        </span>
        {open ? (
          <ChevronUp className="size-4 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronDown className="size-4 text-[var(--muted-foreground)]" />
        )}
      </button>
      {open && origins.length === 0 && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Add a place (home, work, parents…) to see driving times to listings.
        </p>
      )}
      {open && origins.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--border)] rounded-md border border-[var(--border)] bg-[var(--background)]">
          {origins.map((o, index) => {
            const isSelected = selectedIds.includes(o.id)
            const isRowEditing = mode.kind === "edit" && mode.origin.id === o.id
            const isFirst = index === 0
            const isLast = index === origins.length - 1
            return (
              <li
                key={o.id}
                className="flex items-center gap-3 px-3 py-2 first:rounded-t-md last:rounded-b-md data-[active=true]:bg-[var(--accent)]/10 data-[editing=true]:bg-[var(--accent)]/20"
                data-active={isSelected}
                data-editing={isRowEditing}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(o.id)}
                  aria-label={`Toggle ${o.label}`}
                  className="size-4 cursor-pointer accent-[var(--primary)]"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-[var(--foreground)]">
                    {o.label}
                  </span>
                  <span
                    className={
                      confirmingDeleteId === o.id
                        ? "truncate text-xs font-medium text-[var(--destructive,#c0392b)]"
                        : "truncate text-xs text-[var(--muted-foreground)]"
                    }
                  >
                    {confirmingDeleteId === o.id ? "Are you sure?" : o.address}
                  </span>
                </div>
                {confirmingDeleteId === o.id ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="size-7"
                          onClick={async () => {
                            await removeOrigin(o.id)
                            setConfirmingDeleteId(null)
                          }}
                          aria-label={`Confirm remove ${o.label}`}
                        >
                          <Check className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Confirm remove</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setConfirmingDeleteId(null)}
                          aria-label={`Cancel remove ${o.label}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cancel</TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-3.5 w-7 rounded-b-none"
                            onClick={() => moveOrigin(o.id, "up")}
                            disabled={isFirst}
                            aria-label={`Move ${o.label} up`}
                          >
                            <ChevronUp className="size-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move up</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-3.5 w-7 rounded-t-none"
                            onClick={() => moveOrigin(o.id, "down")}
                            disabled={isLast}
                            aria-label={`Move ${o.label} down`}
                          >
                            <ChevronDown className="size-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move down</TooltipContent>
                      </Tooltip>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => startEdit(o)}
                          aria-label={`Edit ${o.label}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setConfirmingDeleteId(o.id)}
                          aria-label={`Remove ${o.label}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {open && origins.length > 0 && formVisible && <Separator />}

      {open && !formVisible && (
        <>
          <Button
            type="button"
            onClick={startAdd}
            disabled={addDisabled}
            variant={origins.length === 0 ? "default" : "outline"}
            className="w-full"
          >
            <Plus className="size-4" />
            Add place
          </Button>
          {atCap && (
            <p className="text-xs text-[var(--muted-foreground)]">
              You&rsquo;ve reached the {ORIGIN_LIMITS.maxOrigins}-place limit. Remove one
              to add another.
            </p>
          )}
        </>
      )}

      {open && formVisible && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
          className="grid gap-2"
        >
          <form.Field name="label">
            {(field) => {
              const error = field.state.meta.errors[0]
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor="origin-label">Label</Label>
                  <Input
                    id="origin-label"
                    placeholder="Label (e.g. Home)"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                  />
                  {error && (
                    <p role="alert" className="text-xs text-[var(--destructive,#c0392b)]">
                      {errorMessage(error)}
                    </p>
                  )}
                </div>
              )
            }}
          </form.Field>
          <form.Field name="address">
            {(field) => {
              const error = field.state.meta.errors[0]
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor="origin-address">Address</Label>
                  <Input
                    id="origin-address"
                    placeholder="Address"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                  />
                  {error && (
                    <p role="alert" className="text-xs text-[var(--destructive,#c0392b)]">
                      {errorMessage(error)}
                    </p>
                  )}
                </div>
              )
            }}
          </form.Field>
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              values: state.values,
            })}
          >
            {({ canSubmit, values }) => {
              const isUnchanged =
                isEditing &&
                values.label === mode.origin.label &&
                values.address === mode.origin.address
              return (
                <div className="mt-1 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={busy}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy || !canSubmit || isUnchanged}
                    className="flex-1"
                  >
                    {!isEditing && <Plus className="size-4" />}
                    {busy
                      ? isEditing
                        ? "Saving…"
                        : "Adding…"
                      : isEditing
                        ? "Save changes"
                        : "Save"}
                  </Button>
                </div>
              )
            }}
          </form.Subscribe>
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </form>
      )}
    </section>
  )
}
