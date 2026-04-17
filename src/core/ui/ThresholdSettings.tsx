import { useState } from "react"
import { ChevronDown, ChevronUp, RotateCcw, Zap } from "lucide-react"
import { revalidateLogic, useForm } from "@tanstack/react-form"
import { useSettings } from "../hooks/useActiveOrigin"
import { updateSettings } from "../storage/settings"
import {
  DEFAULT_FAST_THRESHOLDS,
  fastThresholdsSchema,
  FAST_THRESHOLD_LIMITS,
  type FastThresholds,
  type MatrixDisplayMetric,
} from "../storage/schema"
import { TRANSPORT_OPTIONS } from "./transport"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip"

const METRICS = [
  "duration",
  "distance",
] as const satisfies ReadonlyArray<MatrixDisplayMetric>

const METRIC_UNITS: Record<MatrixDisplayMetric, string> = {
  duration: "min",
  distance: "km",
}

const METRIC_MAX: Record<MatrixDisplayMetric, number> = {
  duration: FAST_THRESHOLD_LIMITS.maxDurationMinutes,
  distance: FAST_THRESHOLD_LIMITS.maxDistanceKm,
}

const errorMessage = (err: unknown): string =>
  typeof err === "string"
    ? err
    : err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err)

export const ThresholdSettings = () => {
  const [settings] = useSettings()
  const [open, setOpen] = useState(false)

  const form = useForm({
    defaultValues: settings.fastThresholds satisfies FastThresholds,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: fastThresholdsSchema },
  })

  const persist = () => {
    const parsed = fastThresholdsSchema.safeParse(form.state.values)
    if (!parsed.success) return
    void updateSettings({ fastThresholds: parsed.data })
  }

  const [spinning, setSpinning] = useState(false)

  const resetToDefaults = () => {
    for (const metric of METRICS) {
      for (const { value: mode } of TRANSPORT_OPTIONS) {
        form.setFieldValue(
          `${metric}.${mode}` as const,
          DEFAULT_FAST_THRESHOLDS[metric][mode]
        )
      }
    }
    void updateSettings({ fastThresholds: DEFAULT_FAST_THRESHOLDS })
    setSpinning(true)
  }

  const isAtDefaults =
    JSON.stringify(form.state.values) === JSON.stringify(DEFAULT_FAST_THRESHOLDS)

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <span className="flex items-center gap-2">
          <Zap className="size-4 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold tracking-tight">Fast threshold</h2>
        </span>
        {open ? (
          <ChevronUp className="size-4 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronDown className="size-4 text-[var(--muted-foreground)]" />
        )}
      </button>

      {open && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted-foreground)]">
              Badges turn green when a listing is within these values.
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefaults}
                  disabled={isAtDefaults}
                >
                  <RotateCcw
                    className="size-3.5"
                    style={
                      spinning ? { animation: "spin 0.6s linear 1 reverse" } : undefined
                    }
                    onAnimationEnd={() => setSpinning(false)}
                    aria-hidden
                  />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="end">
                Restore every threshold to its shipping default.
              </TooltipContent>
            </Tooltip>
          </div>
          <form
            noValidate
            onSubmit={(e) => e.preventDefault()}
            className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-3 gap-y-2"
          >
            <span />
            {METRICS.map((metric) => (
              <Label key={metric} className="text-[11px] text-[var(--muted-foreground)]">
                {METRIC_UNITS[metric]}
              </Label>
            ))}

            {TRANSPORT_OPTIONS.map(({ value: mode, label, Icon }) => (
              <FieldGroup
                key={mode}
                label={
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--foreground)]">
                    <Icon
                      className="size-3.5 text-[var(--muted-foreground)]"
                      aria-hidden
                    />
                    <span>{label}</span>
                  </span>
                }
              >
                {METRICS.map((metric) => (
                  <form.Field key={metric} name={`${metric}.${mode}` as const}>
                    {(field) => {
                      const error = field.state.meta.errors[0]
                      return (
                        <div className="grid gap-0.5">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={FAST_THRESHOLD_LIMITS.min}
                            max={METRIC_MAX[metric]}
                            value={
                              Number.isFinite(field.state.value) ? field.state.value : ""
                            }
                            onChange={(e) => {
                              const next = e.target.valueAsNumber
                              field.handleChange(Number.isFinite(next) ? next : 0)
                              persist()
                            }}
                            onBlur={() => {
                              field.handleBlur()
                              persist()
                            }}
                            aria-invalid={Boolean(error)}
                            aria-label={`${label} ${metric} threshold (${METRIC_UNITS[metric]})`}
                            className="h-8 text-xs"
                          />
                          {error && (
                            <p
                              role="alert"
                              className="text-[10px] text-[var(--destructive,#c0392b)]"
                            >
                              {errorMessage(error)}
                            </p>
                          )}
                        </div>
                      )
                    }}
                  </form.Field>
                ))}
              </FieldGroup>
            ))}
          </form>
        </>
      )}
    </section>
  )
}

type FieldGroupProps = {
  label: React.ReactNode
  children: React.ReactNode
}

const FieldGroup = ({ label, children }: FieldGroupProps) => (
  <>
    {label}
    {children}
  </>
)
